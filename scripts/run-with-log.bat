@echo off
echo Starting Electron app...
for %%f in (*.exe) do (
    "%%f" > log.log 2>&1
    goto :break
)
:break
echo Electron app started. Logs are saved in log.log.
pause