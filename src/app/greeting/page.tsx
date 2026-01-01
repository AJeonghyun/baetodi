import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GreetingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pb-16 pt-20 sm:px-6 lg:px-10">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Greeting
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            협회장 인사말
          </h1>
          <p className="text-slate-600">
            배토디를 찾아주셔서 감사합니다. 땀과 웃음이 어우러지는 배드민턴
            코트에서 서로 응원하며 성장하는 동호회가 되겠습니다.
          </p>
        </div>

        <Card className="overflow-hidden border-slate-200">
          <div className="h-1 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500" />
          <CardContent className="space-y-6 p-6 sm:p-8">
            <p className="text-lg leading-relaxed text-slate-700 sm:text-xl">
              “배토디는 배드민턴을 사랑하는 사람들이 모여 즐겁게 치고,
              진심으로 소통하는 공간입니다. 각자의 실력과 목표는 달라도,
              함께하는 마음은 같습니다. 새로운 분들도 언제든 환영합니다.”
            </p>
            <p className="text-sm text-slate-500">
              꾸준한 모임, 투표를 통한 참여, 서로의 페이스를 존중하는 운영으로
              건강하고 지속 가능한 동호회를 만들어가겠습니다.
            </p>
            <p className="text-sm font-medium text-slate-700">— 협회장 드림</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
