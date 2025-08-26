import React, { useRef } from "react";
import "./JobApplicationsCSVUpload.css";

interface JobApplicationsCSVUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile?: File | null;
  label?: string;
}

export default function JobApplicationsCSVUpload({
  onFileSelect,
  selectedFile = null,
  label = "Choose CSV file",
}: JobApplicationsCSVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
  };

  const handleRemoveFile = () => {
    // Reset the file input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onFileSelect(null);
  };

  return (
    <div className="job-applications-csv-upload">
      <label htmlFor="csv-file-input">{label}</label>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        id="csv-file-input"
      />
      <div className="file-size-limit">Max file size: 5 MB</div>

      {selectedFile && (
        <div className="selected-file">
          <span className="file-name">{selectedFile.name}</span>
          <span className="file-size">
            ({(selectedFile.size / 1024).toFixed(1)} KB)
          </span>
          <button
            type="button"
            onClick={handleRemoveFile}
            className="remove-file"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
