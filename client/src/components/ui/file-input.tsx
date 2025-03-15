import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface FileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange?: (file: File | null) => void;
  onError?: (error: string) => void;
  accept?: string;
  className?: string;
  dropzoneText?: string;
  buttonText?: string;
  acceptText?: string;
  icon?: React.ReactNode;
}

export const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      className,
      onChange,
      onError,
      accept = "*",
      dropzoneText = "Drag & drop your file or",
      buttonText = "Browse Files",
      acceptText,
      icon,
      ...props
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    }, []);

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }, []);

    const handleDrop = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          const file = files[0];
          
          // Check file type
          if (accept !== "*" && !accept.split(",").some(type => file.type.match(type.trim().replace("*", ".*")))) {
            onError?.(`File type not supported. Please upload a ${accept} file.`);
            return;
          }

          onChange?.(file);
        }
      },
      [accept, onChange, onError]
    );

    const handleInputChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          onChange?.(files[0]);
        } else {
          onChange?.(null);
        }
      },
      [onChange]
    );

    const handleButtonClick = React.useCallback(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, []);

    return (
      <div
        className={cn(
          "uploader-area rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors",
          isDragging && "border-primary bg-primary/5",
          className
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        {icon || (
          <span className="material-icons text-4xl text-gray-400 mb-3">cloud_upload</span>
        )}
        <p className="text-sm font-medium text-gray-700 mb-1">{dropzoneText}</p>
        <Button size="sm">{buttonText}</Button>
        {acceptText && <p className="text-xs text-gray-500 mt-2">{acceptText}</p>}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          accept={accept}
          className="hidden"
          {...props}
        />
      </div>
    );
  }
);

FileInput.displayName = "FileInput";
