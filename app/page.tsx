import ChristmasLayout from "@/components/ChristmasLayout";

export default function Home() {
  return (
    <ChristmasLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl border-4 border-red-500/30 max-w-2xl mx-4">
          <div className="text-8xl mb-6 animate-float">🎅</div>
          <h1 className="text-7xl font-bold mb-6 bg-gradient-to-r from-red-600 via-green-600 to-red-600 bg-clip-text text-transparent animate-gradient">
            Secret Santa
          </h1>
          <div className="text-6xl mb-6">🎄 ✨ 🎁</div>
          <p className="text-2xl text-gray-700 dark:text-gray-300 mb-4">
            Welcome to the magical Secret Santa gift exchange!
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            🎉 Spread joy and Christmas cheer! 🎉
          </p>
        </div>
      </div>
    </ChristmasLayout>
  );
}
