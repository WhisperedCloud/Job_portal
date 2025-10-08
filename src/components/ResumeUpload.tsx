import React, { useState } from "react";
import { Button } from "../components/ui/button"; 
import { supabase } from "../integrations/supabase/client";

export default function ResumeUpload({ candidateId, jobId }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const filePath = `${candidateId}/${file.name}`;
    const { data, error } = await supabase.storage
      .from("Resumes") // your existing bucket
      .upload(filePath, file, { upsert: true });

    if (error) {
      alert("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("Resumes")
      .getPublicUrl(filePath);

    const res = await fetch("/api/analyzeResume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId,
        jobId,
        fileUrl: publicUrl.publicUrl,
      }),
    });

    const json = await res.json();
    setResult(json);
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <Button onClick={handleUpload} disabled={uploading}>
        {uploading ? "Analyzing..." : "Upload & Analyze"}
      </Button>

      {result && (
        <div className="mt-3 p-2 border rounded text-sm">
          <p><b>Role Fit:</b> {result.role_fit_score}/100</p>
          <p><b>Matched Skills:</b> {result.skills_matched.join(", ")}</p>
          <p><b>Missing Skills:</b> {result.skills_missing.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
