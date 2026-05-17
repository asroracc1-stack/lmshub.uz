import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/axios";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

interface Student {
  id: string;
  fullName: string;
}

interface StudentComboboxProps {
  selectedStudentId: string | null;
  onSelectStudent: (studentId: string | null, studentName: string | null) => void;
  disabled?: boolean;
}

export function StudentCombobox({
  selectedStudentId,
  onSelectStudent,
  disabled,
}: StudentComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(false);

  const selectedStudentName = React.useMemo(() => {
    return students.find((student) => student.id === selectedStudentId)?.fullName || "";
  }, [selectedStudentId, students]);

  React.useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const response = await api.get<Student[]>("/students/search", {
          params: { query: debouncedSearchQuery },
        });
        setStudents(response.data);
      } catch (error) {
        console.error("Failed to fetch students:", error);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [debouncedSearchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between rounded-lg h-11 border-primary/10 focus:border-primary"
        >
          {selectedStudentId ? selectedStudentName : t("Select student...")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl border-primary/10 shadow-xl">
        <Command>
          <CommandInput
            placeholder={t("Search student...")}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading ? (
              <div className="p-2">
                <Skeleton className="h-8 w-full mb-1" />
                <Skeleton className="h-8 w-full mb-1" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                <CommandEmpty>{t("No student found.")}</CommandEmpty>
                <CommandGroup>
                  {students.map((student) => (
                    <CommandItem
                      key={student.id}
                      value={student.fullName}
                      onSelect={() => {
                        onSelectStudent(student.id, student.fullName);
                        setOpen(false);
                      }}
                      className="rounded-lg"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedStudentId === student.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {student.fullName}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
