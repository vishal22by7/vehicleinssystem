"""
Training script for the VIMS vehicle damage classifier.

This does NOT use Kaggle code. It uses TensorFlow / Keras directly.

Expected dataset layout:

  data/vehicle-damage/
      train/
          minor_scratch/
              img1.jpg
              img2.jpg
              ...
          moderate_damage/
          severe_damage/
          total_loss/
      val/
          minor_scratch/
          ...

You can modify CLASS_NAMES below to match your own folders.
"""

import os
from typing import List

import tensorflow as tf
from tensorflow.keras.preprocessing import image_dataset_from_directory

from damage_model import build_model, CLASSES, DEFAULT_MODEL_PATH

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "vehicle-damage")
BATCH_SIZE = 16
IMG_SIZE = (224, 224)
EPOCHS = 5  # increase for real training


def get_datasets(class_names: List[str]):
    train_dir = os.path.join(DATA_DIR, "train")
    val_dir = os.path.join(DATA_DIR, "val")

    train_ds = image_dataset_from_directory(
        train_dir,
        labels="inferred",
        label_mode="int",
        class_names=class_names,
        batch_size=BATCH_SIZE,
        image_size=IMG_SIZE,
        shuffle=True,
    )
    val_ds = image_dataset_from_directory(
        val_dir,
        labels="inferred",
        label_mode="int",
        class_names=class_names,
        batch_size=BATCH_SIZE,
        image_size=IMG_SIZE,
        shuffle=False,
    )

    return train_ds, val_ds


def main():
    os.makedirs(os.path.dirname(DEFAULT_MODEL_PATH), exist_ok=True)

    class_names = CLASSES  # or customize if your folder names differ
    print("Using class names:", class_names)

    train_ds, val_ds = get_datasets(class_names)

    model = build_model(num_classes=len(class_names))

    # Optional: performance tweaks
    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.prefetch(buffer_size=AUTOTUNE)

    model.summary()

    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS,
    )

    print("✅ Training complete. Saving model to:", DEFAULT_MODEL_PATH)
    model.save(DEFAULT_MODEL_PATH)
    print("✅ Saved model!")


if __name__ == "__main__":
    main()
