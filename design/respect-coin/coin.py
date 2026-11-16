"""Монета Respect MafiaCL — модель для 3D-печати (FDM).

Печать лицевой стороной вниз (на текстурный лист PEI), оборот вверху:
  * лицо: гравировка 0.6 мм — большая R, «RESPECT», «MAFIACL · PRAGUE», кольцо;
  * оборот: углубление Ø30.6 × 0.4 мм под круглую наклейку Ø30 мм с QR,
    паз для ногтя (снять старую наклейку), гравировка по кольцу;
  * гурт (рифление) по ребру, фаски 0.4 мм.
"""
import math
import sys

import numpy as np
import trimesh
from matplotlib.font_manager import FontProperties
from matplotlib.path import Path
from matplotlib.textpath import TextPath
from shapely import affinity
from shapely.geometry import Point, Polygon, box
from shapely.ops import unary_union

D = 40.0          # диаметр
H = 3.4           # толщина
CH = 0.4          # фаска
FRONT = 0.6       # глубина гравировки лица
BACK = 0.4        # глубина гравировки оборота
POCKET_R = 15.3   # углубление под наклейку Ø30 мм
POCKET = 0.4
R = D / 2

F900 = FontProperties(fname="/tmp/coin/sofia-900.ttf")
F800 = FontProperties(fname="/tmp/coin/sofia-800.ttf")


def glyphs(text, size, prop):
    """Текст -> shapely (с учётом дырок по правилу even-odd)."""
    if not text.strip():
        return Polygon()
    tp = TextPath((0, 0), text, size=size, prop=prop)
    polys = [Polygon(p) for p in tp.to_polygons() if len(p) >= 3]
    polys = [p.buffer(0) for p in polys if p.area > 1e-6]
    polys.sort(key=lambda p: -p.area)
    out = []
    for p in polys:  # внешние контуры и дырки: вложенные — вычитаем
        placed = False
        for i, q in enumerate(out):
            if q.contains(p.representative_point()):
                out[i] = q.difference(p)
                placed = True
                break
        if not placed:
            out.append(p)
    return unary_union(out)


def cap_height(prop):
    return glyphs("H", 10, prop).bounds[3] / 10


def arc_text(text, cap, prop, radius, center_deg, outward=True, track=0.06):
    """Буквы по дуге. outward=True — сверху (низ букв к центру), иначе снизу (верх букв к центру)."""
    size = cap / cap_height(prop)
    chars = [(c, glyphs(c, size, prop)) for c in text]
    adv = []
    for c, g in chars:
        w = TextPath((0, 0), c, size=size, prop=prop).get_extents().width if c.strip() else size * 0.3
        adv.append(w + size * track)
    # радиус средней линии букв — по нему считаем угол
    rmid = radius + cap / 2 if outward else radius - cap / 2
    total = sum(adv) - size * track
    ang = math.radians(total / rmid * 180 / math.pi) * 0 + total / rmid
    shapes = []
    pos = -total / 2
    for (c, g), a in zip(chars, adv):
        if not g.is_empty:
            b = g.bounds
            g = affinity.translate(g, -(b[0] + b[2]) / 2, 0)  # центр буквы по x, базовая линия y=0
            mid = pos + (a - size * track) / 2
            theta = mid / rmid
            if outward:
                phi = math.radians(center_deg) - theta
                g = affinity.translate(g, 0, radius)
                g = affinity.rotate(g, math.degrees(phi) - 90, origin=(0, 0))
            else:
                phi = math.radians(center_deg) + theta
                g = affinity.translate(g, 0, -radius)  # базовая линия снаружи, буквы к центру
                g = affinity.rotate(g, math.degrees(phi) - 270, origin=(0, 0))
            shapes.append(g)
        pos += a
    return unary_union(shapes), math.degrees(ang)


def ring(r1, r2):
    return Point(0, 0).buffer(r2, 256).difference(Point(0, 0).buffer(r1, 256))


def front_design():
    cap = 15.0
    size = cap / cap_height(F900)
    rr = glyphs("R", size, F900)
    b = rr.bounds
    rr = affinity.translate(rr, -(b[0] + b[2]) / 2, -(b[1] + b[3]) / 2)
    top, _ = arc_text("RESPECT", 3.4, F900, 12.7, 90, outward=True, track=0.12)
    bottom, span = arc_text("MAFIACL · PRAGUE", 2.6, F800, 16.4, 270, outward=False, track=0.10)
    dots = []
    for deg in (180 - 0, 0):
        pass
    # звёздочки-точки между надписями
    for side in (-1, 1):
        a = math.radians(270 + side * (span / 2 + 9))
        dots.append(Point(15.1 * math.cos(a), 15.1 * math.sin(a)).buffer(0.75, 32))
    return unary_union([rr, top, bottom, ring(17.6, 18.4), *dots])


def back_design():
    top, _ = arc_text("SCAN · MAFIACL.COM", 2.2, F800, 16.2, 90, outward=True, track=0.10)
    bottom, _ = arc_text("RESPECT", 2.2, F800, 18.6, 270, outward=False, track=0.25)
    return unary_union([top, bottom])


def extrude(shape, z0, z1):
    geoms = getattr(shape, "geoms", [shape])
    meshes = []
    for g in geoms:
        if g.is_empty or g.area < 1e-4:
            continue
        m = trimesh.creation.extrude_polygon(g, z1 - z0)
        m.apply_translation([0, 0, z0])
        meshes.append(m)
    return trimesh.util.concatenate(meshes)


def body():
    prof = [(0, 0), (R - CH, 0), (R, CH), (R, H - CH), (R - CH, H), (0, H)]
    m = trimesh.creation.revolve(np.array(prof), sections=256)
    # гурт: 90 полукруглых канавок по ребру
    cuts = []
    for i in range(90):
        a = 2 * math.pi * i / 90
        c = trimesh.creation.cylinder(radius=0.32, height=H - 2 * CH - 0.2, sections=12)
        c.apply_translation([(R + 0.08) * math.cos(a), (R + 0.08) * math.sin(a), H / 2])
        cuts.append(c)
    reed = trimesh.boolean.union(cuts, engine="manifold")
    return trimesh.boolean.difference([m, reed], engine="manifold")


def build():
    coin = body()
    # лицо снизу: при взгляде снизу картинка зеркалится — отражаем по X
    face = affinity.scale(front_design(), xfact=-1, origin=(0, 0))
    face_cut = extrude(face, -0.05, FRONT)
    pocket = Point(0, 0).buffer(POCKET_R, 256).union(box(POCKET_R - 1.0, -1.4, POCKET_R + 1.4, 1.4))
    pocket_cut = extrude(pocket, H - POCKET, H + 0.05)
    back_cut = extrude(back_design(), H - BACK, H + 0.05)
    coin = trimesh.boolean.difference([coin, face_cut, pocket_cut, back_cut], engine="manifold")
    return coin, front_design(), back_design(), pocket


def render(shapes_depth, path, title_bg="#1c0308", engraved_dark=False):
    """Псевдо-фото: карта высот + освещение."""
    n = 900
    xs = np.linspace(-21, 21, n)
    X, Y = np.meshgrid(xs, -xs)
    pts = np.column_stack([X.ravel(), Y.ravel()])
    rad = np.hypot(X, Y)
    h = np.where(rad <= R, H, np.nan)
    h = np.where((rad > R - CH) & (rad <= R), H - (rad - (R - CH)), h)
    for shape, depth in shapes_depth:
        geoms = getattr(shape, "geoms", [shape])
        mask = np.zeros(len(pts), bool)
        for g in geoms:
            for poly in [g.exterior] + list(g.interiors):
                inside = Path(np.array(poly.coords)).contains_points(pts)
                mask ^= inside
        h = np.where(mask.reshape(X.shape) & (rad <= R), np.minimum(h, H - depth), h)
    # гурт на ребре
    ang = np.arctan2(Y, X)
    gy, gx = np.gradient(np.nan_to_num(h, nan=0.0), xs[1] - xs[0])
    light = np.array([-0.6, 0.6, 0.55])
    light /= np.linalg.norm(light)
    nx, ny, nz = -gx, gy, np.ones_like(gx)
    norm = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    shade = np.clip((nx * light[0] + ny * light[1] + nz * light[2]) / norm, 0, 1)
    gold = np.array([0.86, 0.66, 0.16])
    depth_tint = np.clip((H - np.nan_to_num(h, nan=H)) / 0.6, 0, 1)[..., None]
    col = gold * (0.35 + 0.75 * shade[..., None]) * (1 - 0.35 * depth_tint)
    spec = np.clip(shade, 0, 1) ** 18
    col = np.clip(col + 0.35 * spec[..., None], 0, 1)
    bg = np.array([int(title_bg[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    img = np.where(np.isnan(h)[..., None], bg, col)
    import matplotlib.pyplot as plt
    plt.imsave(path, img)


if __name__ == "__main__":
    coin, front, back, pocket = build()
    print("watertight:", coin.is_watertight, "volume mm3:", round(coin.volume, 1), "bounds:", coin.bounds.round(2).tolist())
    coin.export("/tmp/coin/respect-coin.stl")
    coin.export("/tmp/coin/respect-coin.3mf")
    render([(front, FRONT)], "/tmp/coin/preview-front.png")
    render([(pocket, POCKET), (back, BACK)], "/tmp/coin/preview-back.png")
