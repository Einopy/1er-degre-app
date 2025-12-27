import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadFieldProps {
  label?: string;
  value?: string | null;
  onChange: (path: string | null) => void;
  bucket?: string;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  className?: string;
  disabled?: boolean;
}

export function ImageUploadField({
  label = 'Image',
  value,
  onChange,
  bucket = 'workshop-images',
  maxSizeMB = 2,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  className,
  disabled = false,
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadPreview = async () => {
      if (value) {
        try {
          const { data } = supabase.storage.from(bucket).getPublicUrl(value);
          setPreviewUrl(data.publicUrl);
        } catch (err) {
          console.error('Error loading image preview:', err);
        }
      } else {
        setPreviewUrl(null);
      }
    };

    loadPreview();
  }, [value, bucket]);

  const validateFile = (file: File): string | null => {
    if (!acceptedFormats.includes(file.type)) {
      return `Format non supporté. Formats acceptés: ${acceptedFormats.map(f => f.split('/')[1]).join(', ')}`;
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Fichier trop volumineux. Taille maximale: ${maxSizeMB}MB`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    setError(null);
    setUploading(true);
    setUploadProgress(0);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setUploading(false);
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(100);

      if (value) {
        try {
          await supabase.storage.from(bucket).remove([value]);
        } catch (err) {
          console.warn('Error removing old image:', err);
        }
      }

      onChange(filePath);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Erreur lors de l\'upload de l\'image');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      await supabase.storage.from(bucket).remove([value]);
      onChange(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error('Error removing image:', err);
      setError('Erreur lors de la suppression de l\'image');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}

      {previewUrl ? (
        <div className="relative group">
          <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  disabled={uploading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'relative aspect-video rounded-lg border-2 border-dashed transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Upload en cours...</p>
                <Progress value={uploadProgress} className="w-full max-w-xs" />
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Glissez une image ici ou
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className="h-auto p-0"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Parcourir
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Formats: JPG, PNG, WEBP · Max {maxSizeMB}MB
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
