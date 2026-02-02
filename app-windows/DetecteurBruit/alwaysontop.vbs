Set WshShell = CreateObject("WScript.Shell")

' Active la fenêtre courante
WshShell.AppActivate WshShell

' Lance PowerShell pour mettre la fenêtre active en topmost
cmd = "powershell -NoProfile -WindowStyle Hidden -Command " & Chr(34) & _
      "Add-Type '[DllImport(""user32.dll"")]public static extern bool SetWindowPos(IntPtr hWnd,IntPtr hWndInsertAfter,int X,int Y,int cx,int cy,uint uFlags);';" & _
      "$hwnd = (Get-Process | Where-Object {$_.MainWindowHandle -ne 0} | Sort-Object StartTime -Descending | Select-Object -First 1).MainWindowHandle;" & _
      "[Win32]::SetWindowPos($hwnd,[IntPtr](-1),0,0,0,0,0x0003)" & Chr(34)

WshShell.Run cmd, 0, False
