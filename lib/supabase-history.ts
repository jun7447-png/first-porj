"use client";

import { supabase } from "@/lib/supabase";

/** base64 또는 URL 이미지를 Supabase Storage에 업로드하고 공개 URL 반환 */
async function uploadImageToStorage(
  imageUrl: string,
  userId: string
): Promise<string> {
  // fetch로 Blob 변환 (base64 data URL 및 http URL 모두 처리)
  const res = await fetch(imageUrl);
  const blob = await res.blob();

  const ext = blob.type.includes("jpeg") ? "jpg" : "png";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("generated-images")
    .upload(path, blob, { contentType: blob.type, upsert: false });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("generated-images").getPublicUrl(path);

  return publicUrl;
}

/** 이미지 생성 결과를 히스토리 DB에 저장 */
export async function saveImageHistory({
  imageUrl,
  toolType,
  toolName,
  promptSummary,
}: {
  imageUrl: string;
  toolType: string;
  toolName: string;
  promptSummary: string;
}): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return; // 비로그인 시 저장 안 함

  const userId = session.user.id;
  let permanentUrl = imageUrl;

  // Storage 업로드 시도 (실패해도 원본 URL로 기록)
  try {
    permanentUrl = await uploadImageToStorage(imageUrl, userId);
  } catch {
    // CORS 또는 Storage 오류 시 원본 URL 사용
  }

  await supabase.from("image_history").insert({
    user_id: userId,
    tool_type: toolType,
    tool_name: toolName,
    image_url: permanentUrl,
    prompt_summary: promptSummary.slice(0, 300),
  });

  // 총 생성 횟수 업데이트
  await supabase.rpc("increment_total_generated", { uid: userId }).maybeSingle();
}

/** 로그인 사용자의 히스토리 조회 */
export async function getUserHistory() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const { data } = await supabase
    .from("image_history")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/** 로그인 사용자 프로필 조회 */
export async function getUserProfile() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  return data;
}
