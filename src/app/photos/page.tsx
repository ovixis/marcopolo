import { Images } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function PhotosPage() {
  return (
    <ComingSoon
      icon={<Images className="size-8" aria-hidden />}
      title="Photo Gallery"
      leadIn="The album of the road."
      description="Your trip photos, stored in your own Supabase project — you own the storage."
      phase="Weeks 11-12"
      planned={[
        "Drag-and-drop uploads to a private Supabase Storage bucket",
        "Timeline grouped by trip day, with EXIF date and location",
        "Captions and favorites",
        "Feeds the AI journal for narrative synthesis",
      ]}
    />
  );
}
