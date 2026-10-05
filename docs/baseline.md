# Výchozí ověření šablony

Zdroj: petrsafrata/Spring-project-template, master, commit 32dded5e33b83f038655199eb81044fa3d4c66a8 (ověřeno vzdáleně 5. 10. 2026). Pracovní kopie vznikla bez .git a bez sledovaných .env souborů. Původní repozitář nebyl změněn.

Před úpravami: Java 17, Maven Wrapper 3.9.12. `sh mvnw verify` prošel kompilací, ale jediný Testcontainers test skončil chybou kvůli neběžícímu Docker daemonu. Není to úspěšné ověření testů. Wrapper neměl executable bit. Původní Vite: `npm ci` a `npm run build` úspěšné. Audit hlásil 14 zranitelností (1 low, 3 moderate, 10 high). Výchozí frontend je nahrazen novým Next.js stackem.

Zjištěné problémy: springdoc 2.8.5 pro Boot 4; deaktivované CSRF a Flyway; Hibernate update; vlastní login nevolal session strategy; HTTP Basic a remember-me vedle session loginu; duplicitní logout; chybné CORS mapování a origins; health matcher /actuator/; VERSION načítán z pracovního adresáře; releaseNotes.cacheTtlMs neodpovídal InfoService; prázdný produkční Compose; sledované env soubory; chybné frontend API cesty a DTO; Vite AuthContext nerozlišoval chybu sítě od 401.
