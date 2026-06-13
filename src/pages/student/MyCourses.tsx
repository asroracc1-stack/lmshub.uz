import { useTranslation } from "react-i18next";
import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarClock, MapPin, Users2, BookOpen } from "lucide-react";

interface StudentLessonDto {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  attendanceStatus: string | null;
  teacherName: string | null;
  groupName: string | null;
  subjectName: string | null;
  room: string | null;
  description: string | null;
}

export default function MyCourses() {
  const { t } = useTranslation();
  const [lessons, setLessons] = useState<StudentLessonDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await api.get("/student/my-courses");
        // Accessing the list inside StudentLessonResponse (assuming field is 'lessons')
        const data = response.data?.lessons || [];
        setLessons(data);
      } catch (error) {
        console.error("Failed to load courses", error);
        toast.error(t("dynamic.mycourses.darslarni_yuklashda_xatolik_yuz_berdi"));
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, StudentLessonDto[]>();
    lessons.forEach((l) => {
      const day = new Date(l.startsAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "long", weekday: "long" });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(l);
    });
    return Array.from(map.entries());
  }, [lessons]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{t("dynamic.mycourses.mening_darslarim")}</h1>
        <p className="text-muted-foreground">{t("dynamic.mycourses.sizga_biriktirilgan_guruhlar_va_darslar_")}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : grouped.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          Sizda hozircha biriktirilgan darslar yo'q.
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, list]) => (
            <div key={day}>
              <p className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {day}
              </p>
              <div className="grid gap-3">
                {list.map((l) => (
                  <Card key={l.id} className="p-4 flex items-start gap-3 hover:shadow-elegant transition-smooth">
                    <div className={`h-12 w-12 rounded-lg bg-primary/15 grid place-items-center shrink-0`}>
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-semibold truncate">{l.title}</h3>
                        {l.subjectName && <Badge variant="outline">{l.subjectName}</Badge>}
                        {l.attendanceStatus === "PRESENT" && <Badge variant="default">{t("dynamic.mycourses.keldi")}</Badge>}
                        {l.attendanceStatus === "ABSENT" && <Badge variant="destructive">{t("dynamic.mycourses.kelmadi")}</Badge>}
                        {l.attendanceStatus === "LATE" && <Badge variant="warning">{t("dynamic.mycourses.kech_qoldi")}</Badge>}
                        {l.attendanceStatus === "EXCUSED" && <Badge variant="secondary">{t("dynamic.mycourses.sababli")}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {new Date(l.startsAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                          {" – "}
                          {new Date(l.endsAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {l.groupName && (
                          <span className="flex items-center gap-1">
                            <Users2 className="h-3 w-3" /> {l.groupName}
                          </span>
                        )}
                        {l.room && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {l.room}
                          </span>
                        )}
                        {l.teacherName && (
                          <span>• {l.teacherName}</span>
                        )}
                      </div>
                      {l.description && (
                        <p className="text-sm text-muted-foreground mt-2">{l.description}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

