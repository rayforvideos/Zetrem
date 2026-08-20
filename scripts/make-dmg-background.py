"""
DMG 배경 이미지를 만든다.

    python3 scripts/make-dmg-background.py

660x400 (1x) 캔버스에 앱 아이콘과 Applications 링크가 나란히 앉는다.
그 사이, 같은 높이에 화살표 하나만 그린다 — 왼쪽 앱을 오른쪽
Applications 로 끌어다 놓으라는 뜻. 글자도 로고도 없다. 볼륨 창
제목이 이미 "Zetrem"을 말해준다.

2x 를 먼저 그리고 다운스케일해서 1x 를 만든다. 그래야 가장자리가
또렷하다. PIL 은 이 스크립트에서만 쓰는 개발 도구다.
"""
import subprocess

from PIL import Image, ImageDraw

SCALE = 2

WIDTH_1X = 660
HEIGHT_1X = 400

GROUND = (245, 245, 247)  # #f5f5f7
ARROW = (200, 200, 205)  # #c8c8cd

ARROW_Y_1X = 180
ARROW_CENTER_X_1X = 330
ARROW_TOTAL_WIDTH_1X = 70
ARROW_SHAFT_HEIGHT_1X = 4

PNG_1X = 'build/dmg-background.png'
PNG_2X = 'build/dmg-background@2x.png'
TIFF = 'build/dmg-background.tiff'


def draw_arrow(draw: ImageDraw.ImageDraw, scale: int) -> None:
    y = ARROW_Y_1X * scale
    center_x = ARROW_CENTER_X_1X * scale
    total_width = ARROW_TOTAL_WIDTH_1X * scale
    shaft_height = ARROW_SHAFT_HEIGHT_1X * scale

    head_width = round(total_width * 0.4)
    shaft_width = total_width - head_width

    left = center_x - total_width // 2
    shaft_right = left + shaft_width
    right = left + total_width

    half_shaft = shaft_height / 2
    head_half_height = shaft_height * 1.8

    draw.rectangle(
        [left, y - half_shaft, shaft_right, y + half_shaft],
        fill=ARROW,
    )
    draw.polygon(
        [
            (shaft_right, y - head_half_height),
            (right, y),
            (shaft_right, y + head_half_height),
        ],
        fill=ARROW,
    )


def render(scale: int) -> Image.Image:
    size = (WIDTH_1X * scale, HEIGHT_1X * scale)
    image = Image.new('RGB', size, GROUND)
    draw_arrow(ImageDraw.Draw(image), scale)
    return image


def main() -> None:
    hi = render(SCALE)
    hi.save(PNG_2X)

    lo = hi.resize((WIDTH_1X, HEIGHT_1X), Image.LANCZOS)
    lo.save(PNG_1X)

    subprocess.run(
        ['tiffutil', '-cathidpicheck', PNG_1X, PNG_2X, '-out', TIFF],
        check=True,
    )

    print(f'저장 {PNG_1X} {WIDTH_1X}x{HEIGHT_1X}')
    print(f'저장 {PNG_2X} {WIDTH_1X * SCALE}x{HEIGHT_1X * SCALE}')
    print(f'저장 {TIFF}')


if __name__ == '__main__':
    main()
