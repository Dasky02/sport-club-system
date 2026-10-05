# Spolupráce v týmu

Pracujeme pouze v samostatném `sport-club-system`. Původní `petrsafrata/Spring-project-template` je zdrojová šablona; neměňte její kód, historii ani nastavení.

1. Vytvořte krátkou větev z `main`, např. `feat/team-memberships`.
2. Doménový návrh a akceptaci hledejte v `docs/requirements.md` a `docs/roadmap.md`.
3. Zachovejte vrstvy `api`, `config`, `model`, `repository`, `service`, DTO records a constructor injection. První etapa zachovává Java package `cz.jpmad.springprojecttemplate`.
4. Autorizaci kontrolujte ve Spring službě podle role, týmu a případné vazby na dítě. Frontendová ochrana je jen navigace.
5. Přidejte Flyway migraci; již použitou migraci nikdy nepřepisujte. Hibernate běží s `validate`.
6. Ověřte příslušné testy a aktualizujte skutečný stav implementace v dokumentaci.
7. Otevřete PR a nechte jej schválit kolegou. Doporučujeme pravidlo pro `main`: PR povinné, alespoň jedno schválení, CI Backend verify / Frontend checks / Public content and Compose povinné, vyřešené diskuse a zakázaný force push. Tato pravidla jsou doporučení; repository settings zatím nejsou automaticky nastavená.

Nepřidávejte `.env`, lokální databázové dumpy, skutečné osobní údaje ani tajné hodnoty. Používejte `.env.example`. Na PR z forků nejsou potřeba secrets. Testcontainers v CI používá Docker runneru.

Verze: `python3 scripts/bump_version.py 0.2.0` změní kořenový `VERSION`, projektovou verzi Maven a package + npm lock metadata. Doplňte odpovídající sekci do `backend/src/main/resources/RELEASE-NOTES.md` a projděte PR. Ruční workflow Release na `main` teprve po úspěšných kontrolách vytvoří tag a GitHub Release. Volitelné GHCR publikování probíhá jednou pro každý komponent; PR nic nepublikuje. Pro produkční frontend image nastavte repository variable `NEXT_PUBLIC_API_URL=https://vase-domena/api` ještě před release; veřejné Next proměnné se zabudují při build.
