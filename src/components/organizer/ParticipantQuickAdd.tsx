import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOrCreateUser, addParticipantsBatch } from '@/services/organizer-workshops';
import type { ParticipantWithUser } from '@/services/organizer-workshops';

interface RowData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  errors: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  isDuplicate: boolean;
}

interface ParticipantQuickAddProps {
  workshopId: string;
  existingParticipants: ParticipantWithUser[];
  currentUserId: string;
  onParticipantsAdded: () => void;
}

export function ParticipantQuickAdd({
  workshopId,
  existingParticipants,
  currentUserId,
  onParticipantsAdded,
}: ParticipantQuickAddProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<RowData[]>([createEmptyRow()]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const existingEmails = useRef<Set<string>>(new Set());

  useEffect(() => {
    existingEmails.current = new Set(
      existingParticipants.map((p) => p.user.email.toLowerCase().trim())
    );
  }, [existingParticipants]);

  function createEmptyRow(): RowData {
    return {
      id: Math.random().toString(36).substr(2, 9),
      firstName: '',
      lastName: '',
      email: '',
      errors: {},
      isDuplicate: false,
    };
  }

  const normalizeText = (text: string): string => {
    return text.trim().replace(/\s+/g, ' ');
  };

  const normalizeEmail = (email: string): string => {
    return email.toLowerCase().trim();
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateRow = useCallback(
    (row: RowData): { errors: RowData['errors']; isValid: boolean } => {
      const errors: RowData['errors'] = {};

      if (!row.firstName || row.firstName.trim().length === 0) {
        errors.firstName = 'Prénom requis';
      }

      if (!row.lastName || row.lastName.trim().length === 0) {
        errors.lastName = 'Nom requis';
      }

      if (!row.email || row.email.trim().length === 0) {
        errors.email = 'Email requis';
      } else if (!validateEmail(row.email)) {
        errors.email = 'Email invalide';
      }

      const isValid = Object.keys(errors).length === 0 && !row.isDuplicate;
      return { errors, isValid };
    },
    []
  );

  const checkDuplicates = useCallback(
    (updatedRows: RowData[]): RowData[] => {
      const gridEmails = new Set<string>();

      return updatedRows.map((row) => {
        if (!row.email) {
          return { ...row, isDuplicate: false };
        }

        const normalizedEmail = normalizeEmail(row.email);

        const isDuplicateInExisting = existingEmails.current.has(normalizedEmail);
        const isDuplicateInGrid = gridEmails.has(normalizedEmail);

        gridEmails.add(normalizedEmail);

        return {
          ...row,
          isDuplicate: isDuplicateInExisting || isDuplicateInGrid,
        };
      });
    },
    []
  );

  const handleInputChange = (
    rowId: string,
    field: keyof Pick<RowData, 'firstName' | 'lastName' | 'email'>,
    value: string
  ) => {
    setRows((prev) => {
      const updated = prev.map((row) =>
        row.id === rowId ? { ...row, [field]: value, errors: {} } : row
      );
      return checkDuplicates(updated);
    });
    setShowValidation(false);
  };

  const handleBlur = (rowId: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        const normalized = {
          ...row,
          firstName: normalizeText(row.firstName),
          lastName: normalizeText(row.lastName),
          email: normalizeEmail(row.email),
        };

        return normalized;
      })
    );
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    rowIndex: number,
    columnIndex: number
  ) => {
    e.preventDefault();

    const clipboardData = e.clipboardData.getData('text/plain');
    if (!clipboardData) return;

    const lines = clipboardData.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) return;

    const isTSV = lines.some((line) => line.includes('\t'));
    const delimiter = isTSV ? '\t' : /[,;]/;

    const parsedData: string[][] = lines.map((line) =>
      line
        .split(delimiter)
        .map((cell) => normalizeText(cell))
        .slice(0, 3)
    );

    setRows((prev) => {
      const newRows = [...prev];
      let currentRowIndex = rowIndex;
      let currentColIndex = columnIndex;

      parsedData.forEach((rowData) => {
        rowData.forEach((cellValue) => {
          if (currentRowIndex >= newRows.length) {
            newRows.push(createEmptyRow());
          }

          const row = newRows[currentRowIndex];
          if (currentColIndex === 0) row.firstName = cellValue;
          else if (currentColIndex === 1) row.lastName = cellValue;
          else if (currentColIndex === 2) row.email = normalizeEmail(cellValue);

          currentColIndex++;
          if (currentColIndex > 2) {
            currentColIndex = 0;
            currentRowIndex++;
          }
        });

        if (currentColIndex !== 0) {
          currentColIndex = 0;
          currentRowIndex++;
        }
      });

      const duplicateCheckedRows = checkDuplicates(newRows);

      setTimeout(() => {
        const firstEmptyRowIndex = duplicateCheckedRows.findIndex(
          (r) => !r.firstName && !r.lastName && !r.email
        );
        if (firstEmptyRowIndex !== -1) {
          const key = `${duplicateCheckedRows[firstEmptyRowIndex].id}-0`;
          inputRefs.current[key]?.focus();
        }
      }, 0);

      return duplicateCheckedRows;
    });

    const rowCount = parsedData.length;
    toast({
      description: `${rowCount} row${rowCount > 1 ? 's' : ''} pasted`,
    });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    columnIndex: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      const isLastCell = rowIndex === rows.length - 1 && columnIndex === 2;

      if (isLastCell) {
        setRows((prev) => [...prev, createEmptyRow()]);
        setTimeout(() => {
          const newRowKey = `${rows.length}-0`;
          inputRefs.current[newRowKey]?.focus();
        }, 0);
      } else {
        const nextColIndex = columnIndex < 2 ? columnIndex + 1 : 0;
        const nextRowIndex = columnIndex < 2 ? rowIndex : rowIndex + 1;

        if (nextRowIndex < rows.length) {
          const nextKey = `${rows[nextRowIndex].id}-${nextColIndex}`;
          inputRefs.current[nextKey]?.focus();
        }
      }
    }
  };


  const clearRows = () => {
    setRows([createEmptyRow()]);
    setShowValidation(false);
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => {
      const filtered = prev.filter((row) => row.id !== rowId);
      return filtered.length === 0 ? [createEmptyRow()] : checkDuplicates(filtered);
    });
  };

  const handleSubmit = async () => {
    setShowValidation(true);

    const validatedRows = rows.map((row) => {
      const { errors } = validateRow(row);
      return { ...row, errors };
    });

    setRows(validatedRows);

    const validRows = validatedRows.filter((row) => {
      const { isValid } = validateRow(row);
      return isValid && row.firstName && row.lastName && row.email;
    });

    if (validRows.length === 0) {
      toast({
        description: 'Veuillez corriger les erreurs',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    const results: { row: RowData; success: boolean; error?: string; userId?: string }[] = [];

    for (const row of validRows) {
      try {
        const userId = await getOrCreateUser(row.email, row.firstName, row.lastName);
        results.push({ row, success: true, userId });
      } catch (error: any) {
        results.push({
          row,
          success: false,
          error: error.message || 'Failed to create user',
        });
      }
    }

    const successfulUsers = results.filter((r) => r.success && r.userId);
    const failedResults = results.filter((r) => !r.success);

    if (successfulUsers.length > 0) {
      try {
        await addParticipantsBatch(
          workshopId,
          successfulUsers.map((r) => ({
            userId: r.userId!,
            firstName: r.row.firstName,
            lastName: r.row.lastName,
            email: r.row.email,
          })),
          'normal',
          0,
          currentUserId
        );
      } catch (error: any) {
        failedResults.push({
          row: successfulUsers[0].row,
          success: false,
          error: error.message || 'Failed to add participants',
        });
      }
    }

    const successCount = successfulUsers.length;

    setRows((prev) => {
      const remainingRows = prev.filter((row) => {
        const result = results.find((r) => r.row.id === row.id);
        if (result && result.success) return false;

        if (result && !result.success) {
          row.errors.email = result.error;
        }

        return true;
      });

      return remainingRows.length > 0 ? remainingRows : [createEmptyRow()];
    });

    if (successCount > 0) {
      toast({
        title: 'Success',
        description: `${successCount} participant${successCount > 1 ? 's' : ''} added successfully`,
      });
      onParticipantsAdded();
    }

    if (failedResults.length > 0) {
      toast({
        title: 'Some participants failed',
        description: `${failedResults.length} participant${failedResults.length > 1 ? 's' : ''} could not be added`,
        variant: 'destructive',
      });
    }

    setIsProcessing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Ajouter des participants
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-3 items-center pb-2 border-b">
            <Label className="text-xs font-medium text-muted-foreground text-left">Prénom</Label>
            <Label className="text-xs font-medium text-muted-foreground text-left">Nom</Label>
            <Label className="text-xs font-medium text-muted-foreground text-left">Email</Label>
            <div className="w-9"></div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto overflow-x-hidden">
            {rows.map((row, rowIndex) => (
              <div key={row.id} className="space-y-1 py-0.5">
                <div className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-3 items-start">
                  <div className="space-y-1 pl-1">
                    <Input
                      ref={(el) => (inputRefs.current[`${row.id}-0`] = el)}
                      value={row.firstName}
                      onChange={(e) => handleInputChange(row.id, 'firstName', e.target.value)}
                      onBlur={() => handleBlur(row.id)}
                      onPaste={(e) => handlePaste(e, rowIndex, 0)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, 0)}
                      placeholder="Jean"
                      aria-label="Prénom"
                      aria-invalid={!!row.errors.firstName}
                      aria-describedby={row.errors.firstName ? `${row.id}-firstName-error` : undefined}
                      className={row.errors.firstName ? 'border-destructive' : ''}
                    />
                    {showValidation && row.errors.firstName && (
                      <p id={`${row.id}-firstName-error`} className="text-xs text-destructive">
                        {row.errors.firstName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Input
                      ref={(el) => (inputRefs.current[`${row.id}-1`] = el)}
                      value={row.lastName}
                      onChange={(e) => handleInputChange(row.id, 'lastName', e.target.value)}
                      onBlur={() => handleBlur(row.id)}
                      onPaste={(e) => handlePaste(e, rowIndex, 1)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, 1)}
                      placeholder="Dupont"
                      aria-label="Nom"
                      aria-invalid={!!row.errors.lastName}
                      aria-describedby={row.errors.lastName ? `${row.id}-lastName-error` : undefined}
                      className={row.errors.lastName ? 'border-destructive' : ''}
                    />
                    {showValidation && row.errors.lastName && (
                      <p id={`${row.id}-lastName-error`} className="text-xs text-destructive">
                        {row.errors.lastName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Input
                      ref={(el) => (inputRefs.current[`${row.id}-2`] = el)}
                      value={row.email}
                      onChange={(e) => handleInputChange(row.id, 'email', e.target.value)}
                      onBlur={() => handleBlur(row.id)}
                      onPaste={(e) => handlePaste(e, rowIndex, 2)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, 2)}
                      placeholder="jean.dupont@example.com"
                      aria-label="Email"
                      aria-invalid={!!row.errors.email || row.isDuplicate}
                      aria-describedby={
                        row.errors.email || row.isDuplicate
                          ? `${row.id}-email-error`
                          : undefined
                      }
                      className={
                        row.errors.email || row.isDuplicate ? 'border-destructive' : ''
                      }
                    />
                    {showValidation && row.errors.email && (
                      <p id={`${row.id}-email-error`} className="text-xs text-destructive">
                        {row.errors.email}
                      </p>
                    )}
                    {showValidation && row.isDuplicate && !row.errors.email && (
                      <p id={`${row.id}-email-error`} className="text-xs text-destructive">
                        Email déjà participant
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    className="h-9 w-9"
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={clearRows} disabled={isProcessing}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              'Ajouter'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
