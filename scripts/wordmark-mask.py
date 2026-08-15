"""
Zetrem 워드마크(붓글씨 로고)를 화면이 쓸 알파 마스크로 바꾼다.

    python3 scripts/wordmark-mask.py

원본은 흰 바탕에 검은 붓글씨다. 그것을 그대로 화면에 얹으면 두 가지가 깨진다:
어두운 배경 위 유리에서 글자가 사라지고, 흰 사각형이 유리를 덮는다.

이 앱은 모든 글자를 currentColor 로 칠한다. 그래서 잉크가 있는
자리만 **알파**로 남기고 색은 CSS 가 입힌다. `mask-image` 로 이 파일을 씌우고
`bg-current` 로 칠하면 워드마크가 배경 사진의 밝기를 따라 극성을 뒤집는다.

PIL 은 이 스크립트에서만 쓰는 개발 도구다. 앱 의존성이 아니므로 package.json 에 없다.
자산을 다시 만들 일이 있을 때만 `pip install pillow` 로 넣으면 된다.
"""
from PIL import Image

SOURCE = 'resources/wordmark-source.png'
TARGET = 'src/shared/assets/wordmark.png'

# 화면에서 쓰는 가장 큰 크기의 두 배 (@2x). 이보다 크면 바이트만 늘고 보이지 않는다
TARGET_WIDTH = 720


def main() -> None:
    src = Image.open(SOURCE).convert('RGBA')
    print(f'원본 {src.size[0]}x{src.size[1]}')

    # 흰 바탕에 합성해서 "잉크의 진하기" 하나의 회색조로 만든다.
    # 원본에 알파가 있든 없든 같은 결과가 나오게
    flat = Image.new('RGB', src.size, (255, 255, 255))
    flat.paste(src, mask=src.split()[3])
    gray = flat.convert('L')

    # 잉크가 검을수록 불투명하다
    alpha = gray.point(lambda value: 255 - value)

    # 잉크가 있는 범위로 자른다. 여백은 레이아웃이 정할 일이지 이미지가 정할 일이 아니다
    box = alpha.getbbox()
    if box is None:
        raise SystemExit('잉크를 찾지 못했다. 원본이 비어 있는가?')
    alpha = alpha.crop(box)
    print(f'잘라낸 뒤 {alpha.size[0]}x{alpha.size[1]}')

    # RGB 는 흰색으로 채운다. 알파만 쓰이지만, 뷰어에서 열었을 때 알아볼 수 있게
    white = Image.new('L', alpha.size, 255)
    mask = Image.merge('RGBA', (white, white, white, alpha))

    ratio = TARGET_WIDTH / mask.size[0]
    mask = mask.resize((TARGET_WIDTH, round(mask.size[1] * ratio)), Image.LANCZOS)
    mask.save(TARGET, optimize=True)
    print(f'저장 {TARGET} {mask.size[0]}x{mask.size[1]}')


if __name__ == '__main__':
    main()
