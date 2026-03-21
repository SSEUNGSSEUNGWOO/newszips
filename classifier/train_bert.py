import json
import os
import torch
import numpy as np
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer, AutoModelForSequenceClassification, get_linear_schedule_with_warmup
from torch.optim import AdamW
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from tqdm import tqdm

DATA_PATH = "data/train_data.json"
MODEL_DIR = "models"
MODEL_NAME = "klue/bert-base"
MAX_LEN = 128
BATCH_SIZE = 32
EPOCHS = 3
LR = 2e-5

os.makedirs(MODEL_DIR, exist_ok=True)

LABELS = ["IT_과학", "경제", "사회", "스포츠", "연예", "정치"]
LABEL2ID = {l: i for i, l in enumerate(LABELS)}
ID2LABEL = {i: l for i, l in enumerate(LABELS)}


class NewsDataset(Dataset):
    def __init__(self, texts, labels, tokenizer):
        self.encodings = tokenizer(
            texts,
            truncation=True,
            padding=True,
            max_length=MAX_LEN,
            return_tensors="pt"
        )
        self.labels = torch.tensor(labels)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return {
            "input_ids": self.encodings["input_ids"][idx],
            "attention_mask": self.encodings["attention_mask"][idx],
            "labels": self.labels[idx]
        }


def load_data():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    texts = [d["text"][:512] for d in data]
    labels = [LABEL2ID[d["topic"]] for d in data]
    return texts, labels


def evaluate(model, loader, device):
    model.eval()
    preds, trues = [], []
    with torch.no_grad():
        for batch in loader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            pred = outputs.logits.argmax(dim=-1)
            preds.extend(pred.cpu().numpy())
            trues.extend(labels.cpu().numpy())
    return accuracy_score(trues, preds), trues, preds


def train():
    print("데이터 로딩...")
    texts, labels = load_data()

    # 8:1:1 분할
    X_tmp, X_test, y_tmp, y_test = train_test_split(texts, labels, test_size=0.1, random_state=42, stratify=labels)
    X_train, X_val, y_train, y_val = train_test_split(X_tmp, y_tmp, test_size=0.111, random_state=42, stratify=y_tmp)
    print(f"train: {len(X_train)} / val: {len(X_val)} / test: {len(X_test)}")

    print("토크나이저 로딩...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    print("데이터셋 생성...")
    train_dataset = NewsDataset(X_train, y_train, tokenizer)
    val_dataset = NewsDataset(X_val, y_val, tokenizer)
    test_dataset = NewsDataset(X_test, y_test, tokenizer)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0, pin_memory=False)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, num_workers=0, pin_memory=False)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, num_workers=0, pin_memory=False)

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print(f"디바이스: {device}")

    print("모델 로딩...")
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=len(LABELS),
        id2label=ID2LABEL,
        label2id=LABEL2ID
    )
    model.to(device)

    optimizer = AdamW(model.parameters(), lr=LR)
    total_steps = len(train_loader) * EPOCHS
    scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=total_steps // 10, num_training_steps=total_steps)

    print("\n학습 시작...")
    for epoch in range(EPOCHS):
        model.train()
        total_loss = 0
        for batch in tqdm(train_loader, desc=f"Epoch {epoch+1}/{EPOCHS}"):
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
            loss = outputs.loss
            total_loss += loss.item()

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()

        avg_loss = total_loss / len(train_loader)
        val_acc, _, _ = evaluate(model, val_loader, device)
        print(f"  loss: {avg_loss:.4f} | val_acc: {val_acc:.4f}")

    print("\n========== 최종 테스트 결과 ==========")
    test_acc, trues, preds = evaluate(model, test_loader, device)
    print(f"정확도: {test_acc:.4f} ({test_acc*100:.2f}%)")
    print("\n분류 리포트:")
    print(classification_report(trues, preds, target_names=LABELS))

    # 모델 저장
    model.save_pretrained(os.path.join(MODEL_DIR, "klue_bert_classifier"))
    tokenizer.save_pretrained(os.path.join(MODEL_DIR, "klue_bert_classifier"))
    print(f"\n모델 저장 완료 → {MODEL_DIR}/klue_bert_classifier/")


if __name__ == "__main__":
    train()
