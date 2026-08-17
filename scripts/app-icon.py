"""
Zetrem 앱 아이콘을 만든다.

    python3 scripts/app-icon.py && ./scripts/app-icon.sh

검은 판을 캔버스 가장자리까지 채운다. 여백을 남기면 macOS 가 그 아이콘을
자기 밝은 판 위에 얹어 버려서, 우리 판이 한 겹 작아진 채로 보인다.
모서리는 macOS 가 알아서 깎으므로 여기서는 사각으로 둔다.

PIL 은 이 스크립트에서만 쓰는 개발 도구다. `pip install pillow` 로 넣으면 된다.
"""
from PIL import Image

SOURCE = 'resources/wordmark-icon-source.png'
TARGET = 'resources/icon.png'

CANVAS = 1024
PLATE = (10, 10, 10)
MARK_WIDTH = round(CANVAS * 0.78)
DROP = 84


def main() -> None:
    src = Image.open(SOURCE).convert('RGBA')

    ink = src.split()[3].getbbox()
    if ink is None:
        raise SystemExit('잉크를 찾지 못했다. 원본이 비어 있는가?')
    mark = src.crop(ink)

    ratio = MARK_WIDTH / mark.size[0]
    mark = mark.resize((MARK_WIDTH, round(mark.size[1] * ratio)), Image.LANCZOS)

    icon = Image.new('RGBA', (CANVAS, CANVAS), (*PLATE, 255))
    left = (CANVAS - mark.size[0]) // 2
    top = (CANVAS - mark.size[1]) // 2 + DROP
    icon.alpha_composite(mark, (left, top))
    icon.save(TARGET)

    print(f'저장 {TARGET} {CANVAS}x{CANVAS}')
    print(f'마크 {mark.size[0]}x{mark.size[1]} · 좌우 {left} · 위 {top} · 아래 {CANVAS - top - mark.size[1]}')


if __name__ == '__main__':
    main()
