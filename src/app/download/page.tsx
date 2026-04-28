'use client';

export default function DownloadPage() {
  const handleDownload = () => {
    window.open('/招标系统Windows部署指南.doc', '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Word 文档已准备就绪
          </h1>
          
          <p className="text-gray-600 mb-6">
            点击下方按钮下载 Windows 部署指南 Word 文档
          </p>
          
          <button
            onClick={handleDownload}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg"
          >
            下载 Word 文档
          </button>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">
              <strong>文档内容：</strong><br/>
              1. 环境准备（Node.js、pnpm、PostgreSQL）<br/>
              2. 数据库配置<br/>
              3. 项目代码获取<br/>
              4. 环境变量配置<br/>
              5. 局域网访问配置<br/>
              6. 生产模式部署<br/>
              7. 常见问题解答<br/>
              8. 完整部署脚本
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
