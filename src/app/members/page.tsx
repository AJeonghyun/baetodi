import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const pixelAvatar = (fg: string, bg: string) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'><rect width='16' height='16' fill='${bg}'/><rect x='5' y='3' width='6' height='6' rx='1' fill='${fg}'/><rect x='4' y='7' width='8' height='6' rx='1' fill='${fg}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const members = [
  {
    name: "홍길동",
    role: "협회장",
    note: "배드민턴 전략과 운영을 총괄합니다.",
    avatar: pixelAvatar("#0f172a", "#e2e8f0"),
  },
  {
    name: "김철수",
    role: "코치",
    note: "기술 클리닉과 연습 세션을 주도합니다.",
    avatar: pixelAvatar("#0ea5e9", "#e0f2fe"),
  },
  {
    name: "박영희",
    role: "회원",
    note: "즐겁게 참여하며 함께 성장합니다.",
    avatar: pixelAvatar("#22c55e", "#dcfce7"),
  },
  {
    name: "이민수",
    role: "회원",
    note: "신입 환영 담당, 첫 발을 돕습니다.",
    avatar: pixelAvatar("#f97316", "#fff7ed"),
  },
];

export default function MembersPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 pb-20 pt-20 sm:px-6 lg:px-10">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Members
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            회원 소개
          </h1>
          <p className="text-slate-600">
            메인 페이지와 동일한 스타일로, 픽셀 아트 아바타와 함께 회원을
            소개합니다.
          </p>
        </div>

        <Card className="overflow-hidden border-slate-200">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <Card key={member.name} className="border-slate-200">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div
                      className="size-14 rounded-xl border border-slate-200"
                      style={{
                        backgroundImage: member.avatar,
                        imageRendering: "pixelated",
                      }}
                      aria-hidden
                    />
                    <div>
                      <CardTitle className="text-lg">{member.name}</CardTitle>
                      <CardDescription className="text-sm font-medium text-slate-700">
                        {member.role}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-600">
                    {member.note}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
