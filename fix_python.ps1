# Fix Python file associations
$pythonPath = "C:\Users\moeme\AppData\Local\Programs\Python\Python311\python.exe"

# Associate .py with Python
cmd /c assoc .py=Python.File
cmd /c ftype Python.File="$pythonPath" "%1" %*

# Associate .pyw with Python (no console)
cmd /c assoc .pyw=Python.NoConsoleFile
cmd /c ftype Python.NoConsoleFile="$pythonPath" "%1" %*

Write-Host "Python file associations fixed." -ForegroundColor Green
Write-Host "Restart your terminal or log out/in for changes to take effect." -ForegroundColor Yellow
