export default function ChristmasFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 py-4 px-6 bg-gradient-to-t from-black/10 to-transparent backdrop-blur-sm">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
          🎄 Made with love and Christmas spirit by{" "}
          <span className="font-semibold text-red-600 dark:text-red-400">
            Björn Allvin
          </span>{" "}
          🎅
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          May your Secret Santa bring joy and laughter! ✨ |{" "}
          <a
            href="https://github.com/bjornallvin/zanta"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-green-600 dark:hover:text-green-400 transition-colors"
          >
            View Source on GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
