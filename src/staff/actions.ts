"use server"

import { redirect } from "next/navigation"

import { endSession } from "./session"

export async function logOut() {
  await endSession()
  redirect("/login/logged-out")
}
