from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent / 'build'
root.mkdir(exist_ok=True)
im = Image.new('RGBA', (256,256), (0,0,0,0))
draw = ImageDraw.Draw(im)
draw.rounded_rectangle((4,4,252,252),radius=65,fill='#7561ef')
draw.arc((53,52,204,204),55,305,fill='white',width=23)
draw.line((117,88,117,167),fill='#c9ffb8',width=20)
draw.ellipse((107,78,127,98),fill='#c9ffb8')
draw.ellipse((107,157,127,177),fill='#c9ffb8')
draw.line((78,128,157,128),fill='#c9ffb8',width=20)
draw.ellipse((68,118,88,138),fill='#c9ffb8')
draw.ellipse((147,118,167,138),fill='#c9ffb8')
im.save(root/'icon.ico',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
im.save(root/'icon.png')
im.save(root.parent/'public'/'icon.png')
print('Created Citograph application icon')
