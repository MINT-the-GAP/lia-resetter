<!--
author: MINT-the-GAP, Martin Lommatzsch
version: 1.0.0
language: de
narrator: Deutsch Female
edit: true
comment: Starter-Template mit nativen, Kachel-, Orthographie-, Mathematik-, Marker- und Koordinatenquizzen samt Einzelreset.
repository: https://github.com/MINT-the-GAP/lia-resetter

script: ./dist/index.js

import: https://raw.githubusercontent.com/MINT-the-GAP/lia-kachel/main/README.md
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-orthography/main/README.md
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-Mathe/main/README.md
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-marker/main/README.md
import: https://cdn.jsdelivr.net/gh/LiaTemplates/JSXGraph@main/README.md
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-coordinate/Proposal/README.md

import: https://raw.githubusercontent.com/MINT-the-GAP/lia-DynFlex/refs/heads/main/README.md

@resetter: <lia-resetter-host data-lia-resetter></lia-resetter-host>

@Rekonstruktion: @ResetterRekonstruktion_(@uid,`@0`)
@Reconstruction: @ResetterRekonstruktion_(@uid,`@0`)

@ResetterRekonstruktion_
<span id="rek-spec-@0" data-lia-resetter-spec="@1" style="display:none;"></span>

<div id="rek-check-@0">
[[!]]
<script modify="false">
  (() => {
    // Clears only this LiaScript effect result, so an identical answer after
    // an individual restore is evaluated and published again.
    console.clear();
    const node = document.getElementById('rek-spec-@0');
    const spec = node
      ? String(node.dataset.spec || node.dataset.liaResetterSpec || '')
      : String.raw`@1`;

    if (typeof window.__checkReconstructionQuiz === 'function') {
      return window.__checkReconstructionQuiz('@0', spec);
    }

    if (typeof window.__checkRekonstruktionQuiz === 'function') {
      return window.__checkRekonstruktionQuiz('@0', spec);
    }

    if (typeof window.__checkReconstructionFromSpec === 'function') {
      return window.__checkReconstructionFromSpec(spec);
    }

    if (typeof window.__checkRekonstruktionFromSpec === 'function') {
      return window.__checkRekonstruktionFromSpec(spec);
    }

    return false;
  })()
</script>
</div>

<script modify="false">
(function(){
  const node = document.getElementById('rek-spec-@0');
  const spec = node
    ? String(node.dataset.liaResetterSpec || node.dataset.spec || '')
    : String.raw`@1`;
  const anchorId = 'regression-ui-@0';
  let anchor = document.getElementById(anchorId);

  if (!anchor) {
    anchor = document.createElement('span');
    anchor.id = anchorId;
  }

  anchor.hidden = true;
  anchor.style.display = 'none';
  anchor.setAttribute('aria-hidden', 'true');
  anchor.dataset.liaResetterExternal = 'reconstruction';
  if (anchor.parentNode !== document.body) {
    document.body.appendChild(anchor);
  }

  if (node) {
    node.dataset.spec = spec;
  }

  if (typeof window.__setupReconstructionQuiz === 'function') {
    window.__setupReconstructionQuiz('@0', spec);
    return;
  }

  if (typeof window.__setupRekonstruktionQuiz === 'function') {
    window.__setupRekonstruktionQuiz('@0', spec);
  }
})();
</script>
@end

@Resetter.version
<script modify="false" run-once>
window.Resetter?.version ?? "Bundle nicht geladen"
</script>
@end
-->

# Resetter

Dieses Repository enthält ein direkt importierbares LiaScript-Template mit
TypeScript-Quellen unter `src/` und dem gebauten Browser-Bundle unter `dist/`.

Die folgenden Beispiele zeigen grundlegende native LiaScript-Quiztypen, die
drei Kachelvarianten von `lia-kachel` und die drei Quizformen von
`lia-orthography`, alle vier öffentlichen Quizmakros von `lia-Mathe`,
beide grundlegenden Varianten des `lia-marker`-Textmarkerquiz sowie alle
sieben Quizfamilien von `lia-coordinate` im Branch `Proposal`.
Die Quizsyntax selbst bleibt unverändert; das unmittelbar folgende
`@resetter` ergänzt jeweils den vollständigen Einzelreset.

Der Makroaufruf erzeugt dafür einen eigenen Sidecar-Host direkt nach dem Quiz.
Nur dessen Shadow DOM enthält den Reset-Button; insbesondere wird kein
Resetter-Knoten in `.lia-quiz__control` oder eine andere von LiaScript/Elm
verwaltete Kindliste eingefügt. Damit ist der DOM-Patch-Fehler
`created_by_elm` beim anschließenden Prüfen behoben.

Nach Veröffentlichung des Tags `1.0.0` sollte für stabile Kurse der
versionsgebundene Import verwendet werden:

```text
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-resetter/1.0.0/README.md
```

Der aktuelle Entwicklungsstand auf `main` ist über diesen Import erreichbar:

```text
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-resetter/main/README.md
```

Der Tag fixiert den Resetter selbst. Die im Demonstrationskurs verwendeten
Quiz-Templates werden weiterhin aus ihren angegebenen `main`- beziehungsweise
`Proposal`-Branches geladen. Wer vollständig reproduzierbare Kurse benötigt,
muss auch diese direkten Kursimporte auf geprüfte Tags oder Commits festlegen.

Diese Demo verwendet die `main`-Variante. Der Resetter unterstützt alternativ
auch den `Proposal`-Import. In einem Kurs darf genau eine der beiden Varianten
eingebunden werden, weil beide dieselben Makronamen bereitstellen:

```text
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-kachel/main/README.md
```

oder:

```text
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-kachel/Proposal/README.md
```

Die Orthographie-Makros werden zusätzlich direkt importiert:

```text
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-orthography/main/README.md
```

Dasselbe gilt für die vier Bruchquiz-Makros von `lia-Mathe`:

```text
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-Mathe/main/README.md
```

Die Textmarker-Quizze stammen aus `lia-marker`:

```text
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-marker/main/README.md
```

Für die Koordinatenquizze importiert diese Demo `Proposal`, weil nur dort auch
Umfangs-, Flächen- und Konstruktionsquiz verfügbar sind. Die JSXGraph-
Abhängigkeit wird bewusst direkt importiert. Das im Dokumentkopf exportierte
Rekonstruktionsmakro legt den unsichtbaren Coordinate-Hilfsknoten zuerst
außerhalb von LiaScripts Elm-DOM an und aktiviert erst danach den Upstream-
Bootstrap. Dafür ist kein zweites, möglicherweise parallel ladendes Prelude
nötig:

```text
import: https://cdn.jsdelivr.net/gh/LiaTemplates/JSXGraph@main/README.md
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-coordinate/Proposal/README.md
```

Alternativ funktioniert der Resetter auch mit den vier gemeinsamen
Quizfamilien aus `main`:

```text
import: https://cdn.jsdelivr.net/gh/LiaTemplates/JSXGraph@main/README.md
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-coordinate/main/README.md
```

Auch hier darf nur einer der beiden Coordinate-Branches importiert werden,
weil beide dieselben Makronamen definieren.

Der Resetter erfasst den Zustand jedes Coordinate-Boards einmalig direkt nach
dem Makroaufbau. Ein Reset stellt anschließend nicht nur das LiaScript-Quiz,
sondern auch Boardausschnitt und -größe, Makropunkte und -graphen, DGS-
Konstruktionen, Schar- und Reglerwerte sowie die zugehörigen Coordinate-
Register auf diesen Ausgangszustand zurück. Damit der Ausgangszustand
eindeutig bleibt, darf innerhalb eines Abschnitts nur ein zurücksetzbares
Coordinate-Quiz dieselbe Board-ID verwenden.

Mit einem unveränderten LiaScript-Core müssen Drop-/Kachelquizze und andere
Quiztypen in getrennten `##`-Abschnitten stehen, wenn beide einzeln
zurücksetzbar sein sollen. Für gemischte Quizvektoren liegt unter
[`patches/liascript-single-quiz-reset.patch`](./patches/liascript-single-quiz-reset.patch)
eine optionale Core-v2-Erweiterung. Sie wurde gegen LiaScript-Commit
`32192c469928296b7e28b97bbdce632215dd5a9e` (`1.1.0`) geprüft, muss auf den
LiaScript-Quellcode angewendet und zusammen mit diesem neu gebaut werden; sie
ist nicht automatisch Bestandteil von `dist/index.js`.

| Quiztyp | Grundsyntax |
|---|---|
| Multiple Choice | `[[X]]` und `[[ ]]` |
| Single Choice | `[(X)]` und `[( )]` |
| Matrix | Auswahlmarker in Matrixzeilen |
| Texteingabe | `[[ Lösung ]]` |
| Auswahl | Auswahlblock mit eingeklammerter Lösung |
| Kombinierter Lückentext | mehrere Text- und Auswahlfelder in einem Markdown-Block |
| Generisch | `[[!]]` mit einem Prüfskript |
| Kachel | natives `[->[…]]` in `<div class="Kachel">` |
| Kachelfolge | `@Kachelfolge(...)`, Reihenfolge egal |
| Kachelfolge N | `@KachelfolgeN(...)`, Ziele schrittweise sichtbar |
| Orthographie | `@orthography(...)`, einzeilige Korrektur |
| Orthographietext | `@orthographytext(...)`, mehrzeilige Korrektur |
| Diktat | `@diktat(...)`, vorgelesene Texteingabe |
| Kreisquiz | `@circleQuiz(...)` |
| Kreisquiz konfiguriert | `@circleQuizC(...)` |
| Rechteckquiz | `@rectQuiz(...)` |
| Rechteckquiz konfiguriert | `@rectQuizC(...)` |
| Markerquiz mit Sollfarben | `@markred(...)` bis `@markorange(...)` und `@TextmarkerQuiz` |
| Markerquiz mit beliebiger Farbe | `@mark(...)` und `@TextmarkerQuiz` |
| Punkt erzeugen | `@CreatePoint(...)` |
| Punkt auf Graph | `@PointOnGraph(...)` |
| Mehrere Punkte auf Graph | `@PointsOnGraph(...)` |
| Funktionsrekonstruktion | `@Rekonstruktion(...)` |
| Umfang eines Polygons | `@UmfangQuiz(...)` (`Proposal`) |
| Fläche eines Polygons | `@FlaecheQuiz(...)` (`Proposal`) |
| Geometrische Konstruktion | `@KonstruktionQuiz(...)` (`Proposal`) |

Die Kachelvarianten verwenden natives LiaScript-Drag-and-drop, ergänzt um
Darstellung, Touch-Unterstützung und die beiden Kachelfolge-Auswertungen.

## 1. Multiple Choice

Bei Multiple Choice können keine, eine oder mehrere Antworten ausgewählt
werden. Jedes `X` markiert eine richtige Antwort.

Welche Zahlen sind Primzahlen?

- [[X]] 2
- [[X]] 3
- [[ ]] 4
- [[X]] 5

@resetter

## 2. Single Choice

Bei Single Choice kann genau eine Antwort ausgewählt werden. LiaScript erlaubt
zwar mehrere als richtig markierte Alternativen, ausgewählt wird aber nur eine.

Welche Zahl ist gerade?

- [( )] 3
- [(X)] 4
- [( )] 5
- [( )] 7

@resetter

## 3. Matrix-Quiz

Eine Matrix fasst mehrere Auswahlzeilen unter gemeinsamen Spaltenüberschriften
zusammen. Runde Marker erzeugen Single-Choice-Zeilen.


Ordne jedem Beispiel den passenden Aggregatzustand zu.

[[ fest ] [ flüssig ] [ gasförmig ]]
[  (X)       ( )          ( )     ] Eis
[  ( )       (X)          ( )     ] Wasser
[  ( )       ( )          (X)     ] Wasserdampf

@resetter

Eckige Marker erzeugen dagegen Multiple-Choice-Zeilen.

Ordne jeder Zahl alle zutreffenden Eigenschaften zu.

[[ gerade ] [ positiv ] [ Primzahl ]]
[   [X]        [X]          [ ]    ] 4
[   [ ]        [X]          [X]    ] 5
[   [X]        [X]          [X]    ] 2

@resetter

## 4. Texteingabe

Bei einem Textquiz steht die erwartete Eingabe direkt zwischen den doppelten
Klammern. Leerzeichen am Rand können zugleich die sichtbare Feldbreite erhöhen.

Wie viel ist $6 \cdot 7$?

[[ 42 ]]
[[?]] Das Ergebnis ist größer als 40.
[[?]] Es ist das Produkt aus 6 und 7.
****************************************

$6 \cdot 7 = 42$.

****************************************

@resetter

## 5. Auswahl-Quiz

Ein Auswahl-Quiz erscheint als Auswahlliste im Text. Runde Klammern markieren
die richtige Option.


Wie viele Bundesländer hat Deutschland?

Deutschland hat [[ 15 | (16) | 17 ]] Bundesländer.



@resetter

## 6. Kachelquiz

Der Bereich `<div class="Kachel">` verwendet ein natives LiaScript-
Drag-and-drop-Quiz. Die Lösungen bleiben positionsgebunden; `lia-kachel`
ergänzt Darstellung und Touch-Bedienung.

<div class="Kachel">

Ordne die Farben zu.

Himmel: [->[rot|(blau)|grün]] \
Wiese: [->[blau|rot|(grün)]]

</div>

@resetter

## 7. Kachelfolge – Reihenfolge egal

`@Kachelfolge` wertet die richtigen Kacheln als Menge aus. Welche richtige
Kachel in welchem Zielfeld liegt, spielt daher keine Rolle.

<!-- data-randomize="true" -->
Wähle alle Grundfarben aus.

@Kachelfolge(`[->[(Rot)]][->[(Blau)]][->[(Gelb)|Grün]]`)

@resetter

## 8. Kachelfolge N – schrittweise

`@KachelfolgeN` zeigt immer nur das nächste freie Zielfeld. Damit ist die
gesuchte Anzahl nicht vorab an der Zahl sichtbarer Felder erkennbar.

Wähle nacheinander alle warmen Farben aus.

@KachelfolgeN(`[->[(Rot)]][->[(Orange)]][->[(Gelb)|Blau]]`)

@resetter

## 9. Orthographie – einzeilig

`@orthography` verbindet ein frei bearbeitbares Eingabefeld mit einem
LiaScript-Generic-Quiz. Korrigiere Großschreibung und Satzzeichen.

@orthography(`<!-- data-solution-button="2" -->`,`morgen besuchen wir das museum`,`Morgen besuchen wir das Museum.`)

@resetter

## 10. Orthographietext – mehrzeilig

`@orthographytext` verwendet für längere Korrekturen ein mehrzeiliges
Eingabefeld. Korrigiere den folgenden Text.

@orthographytext(`<!-- data-solution-button="2" -->`,`am montag beginnt die projektwoche. alle kinder bringen ihre ideen mit`,`Am Montag beginnt die Projektwoche. Alle Kinder bringen ihre Ideen mit.`)

@resetter

## 11. Diktat

`@diktat` erzeugt eine vorgelesene native Texteingabe. Höre den Satz an und
schreibe ihn vollständig in das Feld.

@diktat(Heute scheint die Sonne.)

@resetter

## 12. Kreisquiz

`@circleQuiz` stellt einen Bruch als Kreis dar. Wähle mit dem Regler die
Anzahl der Kreissektoren und markiere anschließend den angegebenen Anteil.

Stelle den Bruch $\frac{3}{8}$ dar.

@circleQuiz(3/8)

@resetter

## 13. Kreisquiz mit Konfiguration

`@circleQuizC` verwendet dasselbe Kreisquiz und nimmt zusätzlich
LiaScript-Quizattribute entgegen. Hier wird `Auflösen` nach zwei falschen
Versuchen freigeschaltet.

Stelle den Bruch $\frac{2}{5}$ dar.

@circleQuizC(2/5,`<!-- data-solution-button="2" -->`)

@resetter

## 14. Rechteckquiz

`@rectQuiz` teilt ein Rechteck über zwei Regler in Zeilen und Spalten.
Markiere danach den geforderten Flächenanteil.

Stelle den Bruch $\frac{1}{3}$ dar.

@rectQuiz(1/3)

@resetter

## 15. Rechteckquiz mit Konfiguration

`@rectQuizC` ergänzt auch beim Rechteck die nativen LiaScript-Quizattribute.
Nach zwei falschen Versuchen kann in diesem Beispiel aufgelöst werden.

Stelle den Bruch $\frac{3}{4}$ dar.

@rectQuizC(3/4,`<!-- data-solution-button="2" -->`)

@resetter

## 16. Markerquiz mit festen Farben

`@markred`, `@markblue`, `@markgreen`, `@markyellow`, `@markpink`
und `@markorange` legen die jeweils erwartete Markierungsfarbe fest. Das
Quiz muss als eigener `markerquiz`-Bereich geschrieben werden.

Markiere Nomen rot, Verben blau, Adjektive grün, Artikel gelb, Pronomen pink
und Konjunktionen orange.

<div class="markerquiz">
@markyellow(Die) @markgreen(neugierige) @markred(Schülerin)
@markblue(liest), @markpink(sie) @markorange(und) @markblue(notiert).
@TextmarkerQuiz
</div>

@resetter

## 17. Markerquiz mit beliebiger Farbe

`@mark` verlangt eine Markierung, akzeptiert dafür aber jede verfügbare
Markerfarbe.

Markiere alle Verben in einer Farbe deiner Wahl.

<div class="markerquiz">
Mia @mark(liest) einen Text und @mark(schreibt) eine Zusammenfassung.
@TextmarkerQuiz
</div>

@resetter

Die Makros `@markedred` bis `@markedorange` erzeugen ausschließlich
schreibgeschützte, vorgefüllte Beispielmarkierungen und sind daher keine
zusätzliche Quizart.

## 18. Punkt erzeugen

`@CreatePoint` erzeugt einen verschiebbaren Punkt. Der Reset stellt das
gesamte Board einschließlich Ausschnitt, Makroobjekten und persistierten
Coordinate-Referenzen auf den ursprünglichen Makrozustand zurück.

@CoordinateSystem(`xmin=-5;xmax=5;ymin=-4;ymax=4;width=;id=reset_coord_create`)

@AxisLabel(`id=reset_coord_create;xlabel=$x$;ylabel=$y$`)

Ziehe den Punkt $A$ auf die Koordinaten $(2|3)$.

@CreatePoint(`reset_coord_create;A;2;3`,`<!-- data-solution-button="2" -->`)

@resetter

## 19. Punkt auf einem Graphen

`@PointOnGraph` prüft einen verschiebbaren Punkt gegen einen Funktionsgraphen.
Der Einzelreset entfernt Lernzustand und Lösungsgraph und baut anschließend
den ursprünglichen Makrozustand des Boards wieder auf.

@CoordinateSystem(`xmin=-5;xmax=5;ymin=-4;ymax=4;width=;id=reset-coordinate-graph`)

@AxisLabel(`id=reset-coordinate-graph;xlabel=$x$;ylabel=$f(x)$`)

Ziehe den Punkt $B$ auf den Graphen $f(x)=2x-1$.

@PointOnGraph(`reset-coordinate-graph;B;f;2*x-1;0.05`)

@resetter

## 20. Mehrere Punkte auf einem Graphen

`@PointsOnGraph` verlangt mehrere Punkte auf demselben Graphen. Alle
Quizpunkte, der Lösungsgraph und das Board werden gemeinsam auf den beim
Makroaufbau erfassten Ausgangszustand zurückgesetzt.

@CoordinateSystem(`xmin=-5;xmax=5;ymin=-4;ymax=4;width=;id=reset_coord_multi`)

@AxisLabel(`id=reset_coord_multi;xlabel=$x$;ylabel=$g(x)$`)

Ziehe alle drei Punkte auf den Graphen $g(x)=x-1$.

@PointsOnGraph(`reset_coord_multi;n=3;d=2;P;g;x-1;0.05`)

@resetter

## 21. Funktionsrekonstruktion

`@Rekonstruktion` vergleicht eine eingestellte Funktion mit dem Zielterm.
Der Reset öffnet das Quiz erneut und stellt Schar, Regler, Funktionsgraph und
Boardausschnitt auf die beim Makroaufbau erfassten Werte zurück. Das vorherige
LiaScript-Skriptergebnis wird ebenfalls geleert, sodass die Aufgabe wieder
vollständig im Ausgangszustand vorliegt.

@CoordinateSystem(`xmin=-7;xmax=7;ymin=-5;ymax=5;width=;id=reset_coord_reconstruction`)

@AxisLabel(`id=reset_coord_reconstruction;xlabel=$x$;ylabel=$f(x)$`)

@Schar(`f;x;mx+n;reset_coord_reconstruction;term=1;#00ffff`)

Stelle die Funktion $f(x)=2x-1$ ein.

@Rekonstruktion(`reset_coord_reconstruction;2x-1;0.1`)

@resetter

## 22. Umfangsquiz (`Proposal`)

`@UmfangQuiz` prüft den Umfang eines selbst konstruierten Polygons. Der
Einzelreset verwirft die Lernkonstruktion und stellt den ursprünglichen
DGS- und Boardzustand des Makros wieder her.

@CoordinateSystem(`xmin=-1;xmax=6;ymin=-1;ymax=5;width=;id=reset_coord_perimeter`)

@DGS(`reset_coord_perimeter;tools=[200;510;920]`)

Konstruiere ein Dreieck mit dem Umfang $12$.

@UmfangQuiz(`reset_coord_perimeter;3;12;0.05`,`<!-- data-solution-button="2" -->`)

@resetter

## 23. Flächenquiz (`Proposal`)

`@FlaecheQuiz` prüft den Flächeninhalt eines selbst konstruierten Polygons.
Der Button setzt Quiz, Lernkonstruktion und Koordinatensystem gemeinsam auf
den ursprünglichen Makrozustand zurück.

@CoordinateSystem(`xmin=-1;xmax=6;ymin=-1;ymax=5;width=;id=reset_coord_area`)

@DGS(`reset_coord_area;tools=[200;510;920]`)

Konstruiere ein Dreieck mit dem Flächeninhalt $6$.

@FlaecheQuiz(`reset_coord_area;3;6;0.05`,`<!-- data-solution-button="2" -->`)

@resetter

## 24. Konstruktionsquiz (`Proposal`)

`@KonstruktionQuiz` prüft geometrische Eigenschaften und ihre Reihenfolge.
Der Reset entfernt die Lernkonstruktion, öffnet den nativen Quizstatus und
stellt das Coordinate-Board auf den ursprünglichen Makrozustand zurück.

@CoordinateSystem(`xmin=-1;xmax=7;ymin=-1;ymax=5;width=;id=reset_coord_construction`)

@DGS(`reset_coord_construction;tools=[200;510;920]`)

Konstruiere gegen den Uhrzeigersinn ein Dreieck mit einer Seite der Länge
$4$, dem folgenden Innenwinkel von $90°$ und der folgenden Seite der Länge $3$.

@KonstruktionQuiz(`reset_coord_construction;3;fest;S4,W90,S3;streckentoleranz=0.05;winkeltoleranz=1`,`<!-- data-solution-button="2" -->`)

@resetter


## Verwendung

Unter jedes native LiaScript-, Kachel-, Orthographie-, Mathematik-, Marker-
oder Koordinatenquiz kommt genau eine eigene Zeile:

```text
@resetter
```


## Implementation

Das Makro aus dem Dokumentkopf greift auf das kompilierte Bundle zu. Für
`lia-kachel` wird genau einer der beiden oben gezeigten Branch-Imports
verwendet; die Demo aktiviert dort `main`. Für `lia-coordinate` aktiviert sie
`Proposal`, damit alle sieben Quizfamilien enthalten sind:

`script: ./dist/index.js` wird relativ zur importierten Resetter-README
aufgelöst. Deshalb muss `dist/index.js` nach jeder Quell- oder
Versionsänderung neu gebaut und gemeinsam mit README und Quellen committed
werden. Die lokale Script-Zeile sollte nicht allein in einen fremden Kurs
kopiert werden; dafür ist der oben dokumentierte Template-Import vorgesehen.

```html
script: ./dist/index.js

import: https://raw.githubusercontent.com/MINT-the-GAP/lia-kachel/main/README.md
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-orthography/main/README.md
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-Mathe/main/README.md
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-marker/main/README.md
import: https://cdn.jsdelivr.net/gh/LiaTemplates/JSXGraph@main/README.md
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-coordinate/Proposal/README.md

@resetter: <lia-resetter-host data-lia-resetter></lia-resetter-host>

@Resetter.version
<script modify="false" run-once>
window.Resetter?.version ?? "Bundle nicht geladen"
</script>
@end
```




## Kombitest



<section class="dynFlex">

<div class="flex-child">

Bei Multiple Choice können keine, eine oder mehrere Antworten ausgewählt
werden. Jedes `X` markiert eine richtige Antwort.

Welche Zahlen sind Primzahlen?

- [[X]] 2
- [[X]] 3
- [[ ]] 4
- [[X]] 5

@resetter




</div>

<div class="flex-child">




Bei Single Choice kann genau eine Antwort ausgewählt werden. LiaScript erlaubt
zwar mehrere als richtig markierte Alternativen, ausgewählt wird aber nur eine.

Welche Zahl ist gerade?

- [( )] 3
- [(X)] 4
- [( )] 5
- [( )] 7

@resetter




</div>

<div class="flex-child">




Eine Matrix fasst mehrere Auswahlzeilen unter gemeinsamen Spaltenüberschriften
zusammen. Runde Marker erzeugen Single-Choice-Zeilen.


Ordne jedem Beispiel den passenden Aggregatzustand zu.

[[ fest ] [ flüssig ] [ gasförmig ]]
[  (X)       ( )          ( )     ] Eis
[  ( )       (X)          ( )     ] Wasser
[  ( )       ( )          (X)     ] Wasserdampf

@resetter



</div>

<div class="flex-child">


Eckige Marker erzeugen dagegen Multiple-Choice-Zeilen.

Ordne jeder Zahl alle zutreffenden Eigenschaften zu.

[[ gerade ] [ positiv ] [ Primzahl ]]
[   [X]        [X]          [ ]    ] 4
[   [ ]        [X]          [X]    ] 5
[   [X]        [X]          [X]    ] 2

@resetter




</div>

<div class="flex-child">



Bei einem Textquiz steht die erwartete Eingabe direkt zwischen den doppelten
Klammern. Leerzeichen am Rand können zugleich die sichtbare Feldbreite erhöhen.

Wie viel ist $6 \cdot 7$?

[[ 42 ]]
[[?]] Das Ergebnis ist größer als 40.
[[?]] Es ist das Produkt aus 6 und 7.
****************************************

$6 \cdot 7 = 42$.

****************************************

@resetter


</div>


</section>


---

---

## Kombitest: Auswahl-Quiz

Ein Auswahl-Quiz erscheint als Auswahlliste im Text. Runde Klammern markieren
die richtige Option.


Wie viele Bundesländer hat Deutschland?

Deutschland hat [[ 15 | (16) | 17 ]] Bundesländer.



@resetter




---

---

## Kombitest: Kachelquizze

Der Bereich `<div class="Kachel">` verwendet ein natives LiaScript-
Drag-and-drop-Quiz. Die Lösungen bleiben positionsgebunden; `lia-kachel`
ergänzt Darstellung und Touch-Bedienung.

<div class="Kachel">

Ordne die Farben zu.

Himmel: [->[rot|(blau)|grün]] \
Wiese: [->[blau|rot|(grün)]]

</div>

@resetter




---

---

`@Kachelfolge` wertet die richtigen Kacheln als Menge aus. Welche richtige
Kachel in welchem Zielfeld liegt, spielt daher keine Rolle.

<!-- data-randomize="true" -->
Wähle alle Grundfarben aus.

@Kachelfolge(`[->[(Rot)]][->[(Blau)]][->[(Gelb)|Grün]]`)

@resetter




---

---

`@KachelfolgeN` zeigt immer nur das nächste freie Zielfeld. Damit ist die
gesuchte Anzahl nicht vorab an der Zahl sichtbarer Felder erkennbar.

Wähle nacheinander alle warmen Farben aus.

@KachelfolgeN(`[->[(Rot)]][->[(Orange)]][->[(Gelb)|Blau]]`)

@resetter




---

---

## Kombitest: weitere Quiztypen

`@orthography` verbindet ein frei bearbeitbares Eingabefeld mit einem
LiaScript-Generic-Quiz. Korrigiere Großschreibung und Satzzeichen.

@orthography(`<!-- data-solution-button="2" -->`,`morgen besuchen wir das museum`,`Morgen besuchen wir das Museum.`)

@resetter




---

---

`@orthographytext` verwendet für längere Korrekturen ein mehrzeiliges
Eingabefeld. Korrigiere den folgenden Text.

@orthographytext(`<!-- data-solution-button="2" -->`,`am montag beginnt die projektwoche. alle kinder bringen ihre ideen mit`,`Am Montag beginnt die Projektwoche. Alle Kinder bringen ihre Ideen mit.`)

@resetter




---

---

`@diktat` erzeugt eine vorgelesene native Texteingabe. Höre den Satz an und
schreibe ihn vollständig in das Feld.

@diktat(Heute scheint die Sonne.)

@resetter




---

---

`@circleQuiz` stellt einen Bruch als Kreis dar. Wähle mit dem Regler die
Anzahl der Kreissektoren und markiere anschließend den angegebenen Anteil.

Stelle den Bruch $\frac{3}{8}$ dar.

@circleQuiz(3/8)

@resetter




---

---

`@circleQuizC` verwendet dasselbe Kreisquiz und nimmt zusätzlich
LiaScript-Quizattribute entgegen. Hier wird `Auflösen` nach zwei falschen
Versuchen freigeschaltet.

Stelle den Bruch $\frac{2}{5}$ dar.

@circleQuizC(2/5,`<!-- data-solution-button="2" -->`)

@resetter




---

---

`@rectQuiz` teilt ein Rechteck über zwei Regler in Zeilen und Spalten.
Markiere danach den geforderten Flächenanteil.

Stelle den Bruch $\frac{1}{3}$ dar.

@rectQuiz(1/3)

@resetter



---

---

`@rectQuizC` ergänzt auch beim Rechteck die nativen LiaScript-Quizattribute.
Nach zwei falschen Versuchen kann in diesem Beispiel aufgelöst werden.

Stelle den Bruch $\frac{3}{4}$ dar.

@rectQuizC(3/4,`<!-- data-solution-button="2" -->`)

@resetter


---

---



`@markred`, `@markblue`, `@markgreen`, `@markyellow`, `@markpink`
und `@markorange` legen die jeweils erwartete Markierungsfarbe fest. Das
Quiz muss als eigener `markerquiz`-Bereich geschrieben werden.

Markiere Nomen rot, Verben blau, Adjektive grün, Artikel gelb, Pronomen pink
und Konjunktionen orange.

<div class="markerquiz">
@markyellow(Die) @markgreen(neugierige) @markred(Schülerin)
@markblue(liest), @markpink(sie) @markorange(und) @markblue(notiert).
@TextmarkerQuiz
</div>

@resetter




---

---

`@mark` verlangt eine Markierung, akzeptiert dafür aber jede verfügbare
Markerfarbe.

Markiere alle Verben in einer Farbe deiner Wahl.

<div class="markerquiz">
Mia @mark(liest) einen Text und @mark(schreibt) eine Zusammenfassung.
@TextmarkerQuiz
</div>

@resetter

Die Makros `@markedred` bis `@markedorange` erzeugen ausschließlich
schreibgeschützte, vorgefüllte Beispielmarkierungen und sind daher keine
zusätzliche Quizart.



---

---

`@CreatePoint` erzeugt einen verschiebbaren Punkt. Der Reset stellt das
gesamte Board einschließlich Ausschnitt, Makroobjekten und persistierten
Coordinate-Referenzen auf den ursprünglichen Makrozustand zurück.

@CoordinateSystem(`xmin=-5;xmax=5;ymin=-4;ymax=4;width=;id=reset_coord_create`)

@AxisLabel(`id=reset_coord_create;xlabel=$x$;ylabel=$y$`)

Ziehe den Punkt $A$ auf die Koordinaten $(2|3)$.

@CreatePoint(`reset_coord_create;A;2;3`,`<!-- data-solution-button="2" -->`)

@resetter



---

---

`@PointOnGraph` prüft einen verschiebbaren Punkt gegen einen Funktionsgraphen.
Der Einzelreset entfernt Lernzustand und Lösungsgraph und baut anschließend
den ursprünglichen Makrozustand des Boards wieder auf.

@CoordinateSystem(`xmin=-5;xmax=5;ymin=-4;ymax=4;width=;id=reset-coordinate-graph`)

@AxisLabel(`id=reset-coordinate-graph;xlabel=$x$;ylabel=$f(x)$`)

Ziehe den Punkt $B$ auf den Graphen $f(x)=2x-1$.

@PointOnGraph(`reset-coordinate-graph;B;f;2*x-1;0.05`)

@resetter



---

---

`@PointsOnGraph` verlangt mehrere Punkte auf demselben Graphen. Alle
Quizpunkte, der Lösungsgraph und das Board werden gemeinsam auf den beim
Makroaufbau erfassten Ausgangszustand zurückgesetzt.

@CoordinateSystem(`xmin=-5;xmax=5;ymin=-4;ymax=4;width=;id=reset_coord_multi`)

@AxisLabel(`id=reset_coord_multi;xlabel=$x$;ylabel=$g(x)$`)

Ziehe alle drei Punkte auf den Graphen $g(x)=x-1$.

@PointsOnGraph(`reset_coord_multi;n=3;d=2;P;g;x-1;0.05`)

@resetter



---

---

`@Rekonstruktion` vergleicht eine eingestellte Funktion mit dem Zielterm.
Der Reset öffnet das Quiz erneut und stellt Schar, Regler, Funktionsgraph und
Boardausschnitt auf die beim Makroaufbau erfassten Werte zurück. Das vorherige
LiaScript-Skriptergebnis wird ebenfalls geleert, sodass die Aufgabe wieder
vollständig im Ausgangszustand vorliegt.

@CoordinateSystem(`xmin=-7;xmax=7;ymin=-5;ymax=5;width=;id=reset_coord_reconstruction`)

@AxisLabel(`id=reset_coord_reconstruction;xlabel=$x$;ylabel=$f(x)$`)

@Schar(`f;x;mx+n;reset_coord_reconstruction;term=1;#00ffff`)

Stelle die Funktion $f(x)=2x-1$ ein.

@Rekonstruktion(`reset_coord_reconstruction;2x-1;0.1`)

@resetter



---

---

`@UmfangQuiz` prüft den Umfang eines selbst konstruierten Polygons. Der
Einzelreset verwirft die Lernkonstruktion und stellt den ursprünglichen
DGS- und Boardzustand des Makros wieder her.

@CoordinateSystem(`xmin=-1;xmax=6;ymin=-1;ymax=5;width=;id=reset_coord_perimeter`)

@DGS(`reset_coord_perimeter;tools=[200;510;920]`)

Konstruiere ein Dreieck mit dem Umfang $12$.

@UmfangQuiz(`reset_coord_perimeter;3;12;0.05`,`<!-- data-solution-button="2" -->`)

@resetter



---

---

`@FlaecheQuiz` prüft den Flächeninhalt eines selbst konstruierten Polygons.
Der Button setzt Quiz, Lernkonstruktion und Koordinatensystem gemeinsam auf
den ursprünglichen Makrozustand zurück.

@CoordinateSystem(`xmin=-1;xmax=6;ymin=-1;ymax=5;width=;id=reset_coord_area`)

@DGS(`reset_coord_area;tools=[200;510;920]`)

Konstruiere ein Dreieck mit dem Flächeninhalt $6$.

@FlaecheQuiz(`reset_coord_area;3;6;0.05`,`<!-- data-solution-button="2" -->`)

@resetter



---

---

`@KonstruktionQuiz` prüft geometrische Eigenschaften und ihre Reihenfolge.
Der Reset entfernt die Lernkonstruktion, öffnet den nativen Quizstatus und
stellt das Coordinate-Board auf den ursprünglichen Makrozustand zurück.

@CoordinateSystem(`xmin=-1;xmax=7;ymin=-1;ymax=5;width=;id=reset_coord_construction`)

@DGS(`reset_coord_construction;tools=[200;510;920]`)

Konstruiere gegen den Uhrzeigersinn ein Dreieck mit einer Seite der Länge
$4$, dem folgenden Innenwinkel von $90°$ und der folgenden Seite der Länge $3$.

@KonstruktionQuiz(`reset_coord_construction;3;fest;S4,W90,S3;streckentoleranz=0.05;winkeltoleranz=1`,`<!-- data-solution-button="2" -->`)

@resetter
