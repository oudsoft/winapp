:stop
sc stop MyRadconnext

rem cause a ~10 second sleep before checking the service state
ping 127.0.0.1 -n 10 -w 1000 > nul

sc query MyRadconnext | find /I "STATE" | find "STOPPED"
if errorlevel 1 goto :stop
goto :start

:start
net start | find /i "My Racconnext Service">nul && goto :start
sc start MyRadconnext
