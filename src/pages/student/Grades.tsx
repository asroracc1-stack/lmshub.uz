import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import {
  Award,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
} from "lucide-react";

interface GradeDto {
  id: string;
  subjectName: string;
  teacherId: string;
  score: number;
  maxScore: number;
  comment: string | null;
  createdAt: string;
}

interface AttendanceDto {
  id: string;
  lessonId: string;
  status: string;
  note: string | null;
  createdAt: string;
}

interface FeedbackDto {
  id: string;
  subject: string;
  message: string | null;
  status: string; // Used as type here based on backend enums like POSITIVE, NEGATIVE
  createdAt: string;
}

interface StudentAnalyticsDto {
  averageScore: number;
  totalGrades: number;
  attendanceRate: number;
  totalLessons: number;
  grades: GradeDto[];
  attendance: AttendanceDto[];
  feedbacks: FeedbackDto[];
}

export default function StudentGrades() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<StudentAnalyticsDto | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await api.get<StudentAnalyticsDto>("/student/analytics");
        setAnalytics(response.data);
      } catch (error) {
        console.error("Failed to load analytics", error);
        toast.error("Natijalarni yuklashda xatolik yuz berdi");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const stats = {
    avg: analytics?.averageScore ?? 0,
    attRate: analytics?.attendanceRate ?? 0,
    totalGrades: analytics?.totalGrades ?? 0,
    totalAtt: analytics?.totalLessons ?? 0,
  };

  const grades = analytics?.grades ?? [];
  const attendance = analytics?.attendance ?? [];
  const feedbacks = analytics?.feedbacks ?? [];

  const fbIcon = (t: string) => {
    const type = t?.toUpperCase();
    if (type === "POSITIVE") return <ThumbsUp className="h-4 w-4 text-success" />;
    if (type === "NEGATIVE") return <ThumbsDown className="h-4 w-4 text-destructive" />;
    return <MessageCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const attIcon = (s: string) => {
    const status = s?.toUpperCase();
    if (status === "PRESENT") return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (status === "LATE") return <Clock className="h-4 w-4 text-warning" />;
    if (status === "ABSENT") return <XCircle className="h-4 w-4 text-destructive" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const attLabel = (s: string) => {
    const status = s?.toUpperCase();
    if (status === "PRESENT") return "Keldi";
    if (status === "ABSENT") return "Kelmadi";
    if (status === "LATE") return "Kech keldi";
    if (status === "EXCUSED") return "Sababli";
    return status;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Mening natijalarim</h1>
        <p className="text-sm text-muted-foreground">Baholar, davomat va o'qituvchi fikrlari</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">O'rtacha ball</p>
          <p className="font-display font-bold text-3xl mt-1">
            {loading ? <Skeleton className="h-9 w-20" /> : `${stats.avg.toFixed(1)}%`}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Jami baholar</p>
          <p className="font-display font-bold text-3xl mt-1">
            {loading ? <Skeleton className="h-9 w-16" /> : stats.totalGrades}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Davomat</p>
          <p className="font-display font-bold text-3xl mt-1">
            {loading ? <Skeleton className="h-9 w-20" /> : `${stats.attRate.toFixed(0)}%`}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Jami darslar</p>
          <p className="font-display font-bold text-3xl mt-1">
            {loading ? <Skeleton className="h-9 w-16" /> : stats.totalAtt}
          </p>
        </Card>
      </div>

      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades">Baholar ({grades.length})</TabsTrigger>
          <TabsTrigger value="attendance">Davomat ({attendance.length})</TabsTrigger>
          <TabsTrigger value="feedbacks">Fikrlar ({feedbacks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : grades.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">Hali baholar yo'q</Card>
          ) : (
            <div className="grid gap-3">
              {grades.map((g) => {
                const pct = (Number(g.score) / Number(g.maxScore)) * 100;
                return (
                  <Card key={g.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary grid place-items-center">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{g.subjectName || "Fan"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(g.createdAt).toLocaleDateString("uz")}
                        </p>
                        {g.comment && <p className="text-sm mt-1 text-muted-foreground">{g.comment}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-2xl">
                        {g.score}
                        <span className="text-sm text-muted-foreground">/{g.maxScore}</span>
                      </p>
                      <Badge variant={pct >= 80 ? "default" : pct >= 60 ? "secondary" : "destructive"}>
                        {pct.toFixed(0)}%
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : attendance.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">Hali yozuvlar yo'q</Card>
          ) : (
            <div className="grid gap-2">
              {attendance.map((a) => (
                <Card key={a.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {attIcon(a.status)}
                    <div>
                      <p className="font-medium">Dars yozuvi</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString("uz")}
                      </p>
                      {a.note && <p className="text-sm mt-1 text-muted-foreground">{a.note}</p>}
                    </div>
                  </div>
                  <Badge
                    variant={
                      a.status?.toUpperCase() === "PRESENT"
                        ? "default"
                        : a.status?.toUpperCase() === "ABSENT"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {attLabel(a.status)}
                  </Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feedbacks" className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : feedbacks.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">Hali fikrlar yo'q</Card>
          ) : (
            <div className="grid gap-3">
              {feedbacks.map((f) => (
                <Card key={f.id} className="p-4">
                  <div className="flex items-center gap-2">
                    {fbIcon(f.status)}
                    <p className="font-medium">{f.subject}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(f.createdAt).toLocaleDateString("uz")}
                  </p>
                  {f.message && <p className="text-sm mt-2 whitespace-pre-wrap">{f.message}</p>}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
