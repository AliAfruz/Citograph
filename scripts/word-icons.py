"""Draw the Citograph ribbon's original, transparent icon set."""
from PIL import Image, ImageDraw
from pathlib import Path
S=4
OUT=Path(__file__).resolve().parent.parent/'word-addin'/'icons'
OUT.mkdir(parents=True,exist_ok=True)
PURPLE='#7760ce'; INK='#4b526b'; MINT='#35b39b'; PALE='#ece7fc'; WHITE='#ffffff'
def icon(name):
    im=Image.new('RGBA',(32*S,32*S)); d=ImageDraw.Draw(im)
    def line(points,color=INK,w=1.7): d.line([(round(x*S),round(y*S)) for x,y in points],fill=color,width=round(w*S),joint='curve')
    def rect(box,fill=None,outline=INK,w=1.5,r=2): d.rounded_rectangle(tuple(round(t*S) for t in box),radius=round(r*S),fill=fill,outline=outline,width=round(w*S))
    def circle(box,fill=None,outline=INK,w=1.5): d.ellipse(tuple(round(t*S) for t in box),fill=fill,outline=outline,width=round(w*S))
    def doc():
        rect((5,3,25,29),PALE,PURPLE,r=3)
        for y in (11,16,21): line([(9,y),(21,y)],PURPLE,1.5)
    def plus(x,y): line([(x-4,y),(x+4,y)],WHITE,1.8);line([(x,y-4),(x,y+4)],WHITE,1.8)
    def arrow(x,y): line([(x-5,y),(x+4,y)],MINT,2);line([(x+1,y-3),(x+4,y),(x+1,y+3)],MINT,2)
    if name=='insert':
        doc();circle((17,17,31,31),MINT,MINT);plus(24,24)
    elif name=='edit':
        doc();line([(17,26),(28,15)],MINT,4);line([(16,27),(17,23)],INK,1.5)
    elif name in ('update','refresh'):
        circle((5,5,27,27),PALE,PURPLE,2);line([(7,10),(3,10),(3,4)],PURPLE,2);line([(25,22),(30,22),(30,28)],MINT,2)
        line([(11,16),(15,20),(22,12)],MINT,2.2)
    elif name=='navigate':
        rect((3,4,22,28),PALE,PURPLE);line([(7,10),(17,10)],PURPLE);line([(7,16),(17,16)],PURPLE);line([(7,22),(14,22)],PURPLE);arrow(25,20)
    elif name=='bibliography':
        for x,y in ((3,5),(6,3),(9,1)): rect((x,y,x+20,y+26),WHITE if x==9 else PALE,PURPLE,1.4)
        for y in (9,14,19,24): circle((12,y-1,14,y+1),MINT,MINT,.5);line([(17,y),(25,y)],PURPLE,1.3)
    elif name=='travel':
        rect((2,10,30,28),PALE,PURPLE,1.7,3);rect((11,5,21,11),None,PURPLE,1.7);line([(2,16),(30,16)],PURPLE);rect((13,14,19,19),MINT,MINT,1,1)
    elif name in ('export','library-export','import'):
        doc();rect((2,23,30,30),WHITE,PURPLE,1.5);x=26
        line([(x,8),(x,24)],MINT,2.3)
        if name=='import': line([(22,19),(26,24),(30,19)],MINT,2.3)
        else:line([(22,13),(26,8),(30,13)],MINT,2.3)
    elif name=='app':
        rect((3,3,29,29),PURPLE,PURPLE,1,7)
        for x in (9,17): rect((x,10,x+5,16),WHITE,None,r=1);line([(x+4,16),(x+4,21),(x,23)],WHITE,1.5)
        circle((24,24,30,30),MINT,MINT,1)
    elif name=='check':
        doc();circle((14,15,31,32),MINT,MINT,1);line([(19,24),(22,27),(28,20)],WHITE,2)
    elif name=='unlink':
        rect((3,7,19,15),None,PURPLE,2,4);rect((14,17,30,25),None,MINT,2,4);line([(10,23),(22,9)],INK,2)
    elif name=='help':
        circle((3,3,29,29),PALE,PURPLE,1.8);d.arc((11*S,8*S,22*S,19*S),190,490,fill=PURPLE,width=2*S);line([(16,18),(16,21)],PURPLE,2);circle((15,24,17,26),MINT,MINT,1)
    im.resize((32,32),Image.Resampling.LANCZOS).save(OUT/(name+'.png'))
    return im.resize((96,96),Image.Resampling.LANCZOS)
names=['insert','edit','update','navigate','bibliography','refresh','export','travel','import','library-export','app','check','unlink','help']
sheet=Image.new('RGB',(7*140,2*145),'#f7f8fb');draw=ImageDraw.Draw(sheet)
for i,name in enumerate(names):
    pic=icon(name);x=(i%7)*140;y=(i//7)*145;sheet.paste(pic,(x+22,y+7),pic);draw.text((x+12,y+112),name,fill=INK)
sheet.save(OUT.parent/'Ribbon-icons-preview.png')
print('Created',len(names),'original ribbon icons')
