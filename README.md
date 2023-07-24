
  # MyGuide@TenneT

1. Öffnen Sie das Repository in Quelltext-Editor (wir empfehlen VS Code)
2. Kopieren Sie den bereitgestellten 'env'-File in das Repository und bennen ihn um in '.env'
3. Öffnen Sie das Terminal in Ihrem aktuellen Ordner
4. Stellen Sie sicher, das Docker Desktop auf Ihrem System instaliert und gestartet ist
4. Führen Sie den Befehl 'docker-compose up' aus - Programm wird gestartet, dies könnte einige Zeit dauern
5. Bei Erfolg sollte das Terminal 'Server started on port 3000' anzeigen und in Docker Desktop ein Container mit dem Namen 'myguide_tennet-1' und zwei laufenden Prozessen angezeigt werden
6. Öffnen Sie im Browser 'http://localhost:3000/register.html'

7. Registrieren Sie sich mit einem Usernameund Passwort, geben Sie unter Role 'admin' ein um vollen Zugriff zu erhalten - Drücken Sie auf 'Submit'
8. Loggen Sie sich mit Ihren Daten ein, in Zukunft können Sie sich direkt unter 'http://localhost:3000/login.html' anmelden
(Ignorieren Sie die Fehlermeldung, diese liegt daran, das noch keine Guideline hochgeladen wurde.)

Nun können Sie durch unseren Prototypen navigieren.
Wir empfehlen erst einmal unter dem Uploadsysmbol oben rechts einige Guidelines hochzuladen.
Bitte beachten Sie, das aufgrund der Verbindung zur OpenAI API nur Dokumente mit einer bestimmten länge hochgeladen werden können, um sicher zu gehen verwenden Sie die von uns bereitgestellten Beispiel Guidelines. 
