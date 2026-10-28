# Informace o datech — pracovní text skeletonu

Aktuální základ P1–P3 ukládá uživatelské jméno, UUID účtu, BCrypt hash hesla, systémovou roli, typ a stav účtu a časy změn. Oddělená osoba má jméno, příjmení, volitelné datum narození, e-mail a telefon; hráčský profil vyžaduje datum narození. Evidují se sporty, sezóny, týmy a historie hráčských a trenérských členství. Hráč může být evidovaný bez přístupového účtu. Audit správních změn obsahuje technické identifikátory, nikoli kopie kontaktních údajů, hesel nebo instalačního tokenu. Přihlášení používá nezbytnou session cookie JSESSIONID a CSRF token uložený v session.

Administrátor spravuje evidované osoby a členství. Týmová soupiska vrací jen jména a intervaly členství, nikoli kontakty a datum narození. Běžný účet potřebuje pro týmové čtení aktuální vlastní členství, trenérské přiřazení nebo schválenou rodičovskou vazbu na dítě s aktuálním členstvím. Správce ověřuje a eviduje schválení a odvolání zástupce, založení účtu pro existující osobu a odůvodnění bezpečnostních změn. Dětský účet má vlastní přihlášení a vyžaduje platného aktivního rodiče; nemá přístup k financím. Ztráta posledního takového rodiče účet zablokuje a odvolá dosavadní přihlášení. Události, zdravotní údaje, příspěvky a komunikace zatím nejsou funkčně dostupné.

V tomto školním základu používejte smyšlená testovací data. Toto není finální dokument ochrany osobních údajů. Před ostrým provozem tým a provozovatel doplní rozsah zpracování, správce a kontakt, dobu uchování, uživatelská práva a postup odstranění dat.

Žádná analytika třetích stran ani platební brána není součástí skeletonu.
