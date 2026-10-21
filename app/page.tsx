import Shell from "@/components/Shell";

export default function Home() {
  return (
    <Shell>
      <div className="stage">
        <h1 className="display">Secret Santa</h1>
        <p className="lead">
          Alla på Awolve, även ni som börjar snart, får inom kort en personlig
          länk. <strong>Öppna din när den kommer</strong> så ser du vem du ska
          köpa julklapp till.
        </p>
      </div>
    </Shell>
  );
}
