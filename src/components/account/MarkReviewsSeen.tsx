"use client";

import { useEffect } from "react";
import { markMyReviewsSeen } from "@/lib/testimonial-actions";

/** Кабинет показан с новыми отзывами — отмечаем их просмотренными (отметки «новый» останутся до перезагрузки). */
export function MarkReviewsSeen() {
  useEffect(() => {
    void markMyReviewsSeen();
  }, []);
  return null;
}
