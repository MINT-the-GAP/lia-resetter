<!--
author: lia-resetter test suite
version: 1.0.0
language: en
comment: Integration fixture for collision-free Coordinate and Resetter reconstruction macros.

import: https://cdn.jsdelivr.net/gh/LiaTemplates/JSXGraph@main/README.md
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-coordinate/main/README.md
import: https://raw.githubusercontent.com/MINT-the-GAP/lia-resetter/main/README.md
-->

# Reconstruction macro ownership

## Coordinate reconstruction

@CoordinateSystem(`xmin=-4;xmax=4;ymin=-4;ymax=4;width=360;id=coordinate_reconstruction`)

@Schar(`f;x;m*x+n;coordinate_reconstruction;term=1;#00ffff`)

Adjust the function to $f(x)=2x-1$.

@Reconstruction(`coordinate_reconstruction;2*x-1;0.1`)

## Resettable reconstruction

@CoordinateSystem(`xmin=-4;xmax=4;ymin=-4;ymax=4;width=360;id=resetter_reconstruction`)

@Schar(`g;x;m*x+n;resetter_reconstruction;term=1;#ff00ff`)

Adjust the function to $g(x)=2x-1$.

@ResetterReconstruction(`resetter_reconstruction;2*x-1;0.1`)

@resetter
