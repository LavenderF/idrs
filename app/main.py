from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import numpy as np
import uvicorn
import os

# --- 1. 定义数据模型 ---
class TextInput(BaseModel):
    text: str

class PredictionResponse(BaseModel):
    probabilities: list
    labels: list

# --- 2. 初始化 FastAPI ---
app = FastAPI(title="IDRS Stereotype Detection API")

# --- 3. 加载模型和分词器 ---
# 这里的路径 'model/' 需要指向你存放模型文件的地方
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "model")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
model.eval()  # 切换到评估模式

# 定义9个类别的标签列表，顺序需与训练时一致
LABELS = [
    'competence', 'gender', 'intelligence', 'morality', 'race_ethnicity',
    'social_skills', 'substance_use', 'wealth_class', 'work_ethic'
]

# 设置预测阈值，可根据需要调整，论文中建议0.35-0.5
THRESHOLD = 0.5

# --- 4. 定义预测端点 ---
@app.post("/predict", response_model=PredictionResponse)
async def predict(input: TextInput):
    try:
        # 4.1 分词
        inputs = tokenizer(
            input.text,
            return_tensors="pt",
            truncation=True,
            max_length=128,
            padding=True
        )

        # 4.2 模型推理
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probabilities = torch.sigmoid(logits).squeeze().tolist()

        # 4.3 如果概率是单个浮点数，转为列表
        if isinstance(probabilities, float):
            probabilities = [probabilities]

        # 4.4 根据阈值筛选标签
        predicted_labels = [
            LABELS[i] for i, prob in enumerate(probabilities)
            if prob >= THRESHOLD
        ]

        return PredictionResponse(
            probabilities=probabilities,
            labels=predicted_labels
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 5. 启动服务 (用于直接运行此脚本) ---
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
