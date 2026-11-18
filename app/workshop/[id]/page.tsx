import { WorkshopDetail } from "./WorkshopDetail";

export const instant = false;

export default async function WorkshopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkshopDetail id={id} />;
}