"use server";

import { revalidatePath } from "next/cache";
import { createEvent, updateEvent, deleteEvent, type EventInput } from "@/lib/google-calendar";

export async function saveEvent(id: string | null, input: EventInput) {
  if (!input.title.trim()) throw new Error("Titel is verplicht");
  if (id) {
    await updateEvent(id, input);
  } else {
    await createEvent(input);
  }
  revalidatePath("/agenda");
}

export async function removeEvent(id: string) {
  await deleteEvent(id);
  revalidatePath("/agenda");
}
