import Shell from "@/components/Shell";

export default function Home() {
  return (
    <Shell>
      <div className="stage">
        <h1 className="display">Secret Santa</h1>
        <p className="lead">
          Everyone at Awolve gets a personal link. <strong>Open yours</strong> to
          see who you&rsquo;re buying a gift for.
        </p>
      </div>
    </Shell>
  );
}
