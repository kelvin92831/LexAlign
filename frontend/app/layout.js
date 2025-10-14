import './globals.css';

export const metadata = {
  title: '法規對應比對系統',
  description: '自動比對法規修訂與公司內規，生成修改建議',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-primary-600">
                  法規對應比對系統
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  資安部門專用系統
                </span>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="mt-auto py-6 text-center text-sm text-gray-500 border-t">
          <p>© 2025 法規對應比對系統 v1.0</p>
        </footer>
      </body>
    </html>
  );
}

