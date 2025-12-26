"""
Standalone vehicle damage classifier used by the VIMS project.

This module defines a simple ResNet50-based classifier that you can train
on your own dataset (no Kaggle dependency). It provides a clean
`analyze_damage(image_bytes)` function used by the FastAPI service.

You are expected to:
  1. Prepare a dataset in folders, e.g.:
        data/vehicle-damage/train/<class_name>/*.jpg
        data/vehicle-damage/val/<class_name>/*.jpg
  2. Run train.py to train and save the model.
  3. Start app.py to serve predictions.
"""

import io
import os
from typing import Dict, Any, List

import numpy as np
from PIL import Image
from tensorflow.keras import layers, models
from tensorflow.keras.applications import ResNet50
from tensorflow.keras.applications.resnet50 import preprocess_input

# Default path where the trained model is stored
DEFAULT_MODEL_PATH = os.getenv(
    "VEHICLE_DAMAGE_MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "model", "vehicle_damage_model.keras")
)

# Class labels and severity mapping.
# You can change these to match your dataset.
CLASSES: List[str] = [
    "minor_scratch",      # 0
    "moderate_damage",    # 1
    "severe_damage",      # 2
    "total_loss"          # 3
]

# Map each class to a severity score (0-100)
CLASS_SEVERITY = {
    "minor_scratch": 15,
    "moderate_damage": 40,
    "severe_damage": 70,
    "total_loss": 90,
}

_model = None  # cached Keras model instance


def build_model(num_classes: int) -> models.Model:
    """
    Build a ResNet50-based classifier from scratch (no external .h5 files).

    NOTE: This builds the architecture. The weights will be:
      - Random, if you call this directly.
      - Learned, if you train the model using train.py.
    """
    base = ResNet50(
        include_top=False,
        weights="imagenet",        # ImageNet weights as generic feature extractor
        input_shape=(224, 224, 3)
    )
    base.trainable = False  # freeze backbone for transfer learning

    x = layers.GlobalAveragePooling2D()(base.output)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = models.Model(inputs=base.input, outputs=outputs)
    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model


def _load_or_build_model() -> models.Model:
    """
    Try to load a trained model from disk.
    If not found, build a new untrained model so the API still works.
    """
    global _model
    if _model is not None:
        return _model

    if os.path.exists(DEFAULT_MODEL_PATH):
        from tensorflow.keras.models import load_model
        print(f"[ML-MODEL] Loading trained model from: {DEFAULT_MODEL_PATH}")
        _model = load_model(DEFAULT_MODEL_PATH)
        print("[ML-MODEL] Model loaded successfully.")
        return _model

    # Fallback: build untrained model
    print(f"[ML-MODEL] WARNING: Trained model not found at {DEFAULT_MODEL_PATH}")
    print("[ML-MODEL] Building a new untrained model (random weights).")
    _model = build_model(len(CLASSES))
    return _model


def _preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Convert raw image bytes into a preprocessed tensor for ResNet50.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        raise ValueError(f"Cannot open image: {e}")

    if image.mode != "RGB":
        image = image.convert("RGB")

    image = image.resize((224, 224))
    arr = np.array(image, dtype=np.float32)
    arr = np.expand_dims(arr, axis=0)
    arr = preprocess_input(arr)
    return arr


def analyze_damage(image_bytes: bytes) -> Dict[str, Any]:
    """
    Main entry point used by the FastAPI service.

    Returns a dict with keys:
      - is_vehicle: bool (assumed True here)
      - severity: int (0-100)
      - damage_parts: list[str] (predicted class label)
      - confidence: float (0-1)
      - description: str
      - validation_error: str | None
    """
    if not isinstance(image_bytes, (bytes, bytearray)) or len(image_bytes) == 0:
        raise ValueError("Invalid image data: empty or not bytes")

    model = _load_or_build_model()
    x = _preprocess_image(image_bytes)

    # Prediction
    preds = model.predict(x)[0]
    preds = preds.tolist() if hasattr(preds, "tolist") else preds

    import numpy as np  # local import to avoid confusion
    max_idx = int(np.argmax(preds))
    max_prob = float(preds[max_idx])

    # Map index -> label
    if 0 <= max_idx < len(CLASSES):
        label = CLASSES[max_idx]
    else:
        label = f"class_{max_idx}"

    severity = int(CLASS_SEVERITY.get(label, round(max_prob * 100)))
    description = f"Predicted damage level: {label} (confidence {max_prob:.2f})."

    return {
        "is_vehicle": True,                 # this model assumes vehicle image input
        "severity": severity,
        "damage_parts": [label],
        "confidence": max_prob,
        "description": description,
        "validation_error": None,
    }
