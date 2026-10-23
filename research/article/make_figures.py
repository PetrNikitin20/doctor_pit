from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import math
BASE=Path(__file__).parent
FONT='C:/Windows/Fonts/times.ttf';BOLD='C:/Windows/Fonts/timesbd.ttf'
def font(n,b=False):return ImageFont.truetype(BOLD if b else FONT,n)
def centered(draw,xy,txt,f,fill='black',spacing=10):
 box=draw.multiline_textbbox((0,0),txt,font=f,spacing=spacing,align='center')
 draw.multiline_text((xy[0]-(box[2]-box[0])/2,xy[1]-(box[3]-box[1])/2-box[1]),txt,font=f,fill=fill,spacing=spacing,align='center')
def arrow(d,pts):
 d.line(pts,fill='black',width=4)
 x,y=pts[-1];a,b=pts[-2];ang=math.atan2(y-b,x-a)
 d.polygon([(x,y),(x-20*math.cos(ang-.45),y-20*math.sin(ang-.45)),(x-20*math.cos(ang+.45),y-20*math.sin(ang+.45))],fill='black')
im=Image.new('RGB',(1900,640),'white');d=ImageDraw.Draw(im)
xs=[40,695,1350];ys=[35,375];w,h=510,220
texts=[('Программа и индикаторы','дисциплина → учебная единица'),('Версия задания','тесты, рубрика, уровень'),('Попытка и гипотеза','режим помощи, параметры'),('Решение о переходе','версия правила, объяснение'),('Свидетельство','исход, контекст, актуальность'),('Артефакт и проверка','версия кода, отзыв')]
for idx,(title,sub) in enumerate(texts):
 row,col=divmod(idx,3);x,y=xs[col],ys[row]
 d.rectangle((x,y,x+w,y+h),outline='black',width=3)
 centered(d,(x+w/2,y+75),title,font(40,True));centered(d,(x+w/2,y+145),sub,font(30))
for a,b in [([(550,145),(695,145)],'связь'), ([(1205,145),(1350,145)],'версия'), ([(1605,255),(1605,375)],'код'), ([(1350,485),(1205,485)],'отзыв'), ([(695,485),(550,485)],'расчёт')]:
 arrow(d,a)
 if a[0][1]==a[1][1]: centered(d,((a[0][0]+a[1][0])/2,a[0][1]-35),b,font(26))
 else: d.text((a[0][0]+25,295),b,font=font(27),fill='black')
im.save(BASE/'entities.png',dpi=(300,300))

W,H=1900,1000;im=Image.new('RGB',(W,H),'white');d=ImageDraw.Draw(im)
L,R,T,B=170,1820,80,815
def point(n,q):return(L+(R-L)*n/30,B-(B-T)*q)
for y in [0,.2,.4,.6,.8,1]:
 py=point(0,y)[1];d.line((L,py,R,py),fill='#d0d0d0',width=2)
 d.text((70,py-22),f'{y:.1f}'.replace('.',','),font=font(37),fill='black')
for n in range(0,31,5):
 px=point(n,0)[0];d.line((px,B,px,B+12),fill='black',width=3);centered(d,(px,B+45),str(n),font(37))
d.line((L,T,L,B,R,B),fill='black',width=4)
for m,kind in [(1,'solid'),(2,'dash'),(4,'dot')]:
 for n in range(0,300):
  if kind=='dash' and n%16>=10:continue
  if kind=='dot' and n%7>=3:continue
  n1,n2=n/10,(n+1)/10
  d.line([point(n1,(.05/m)**(1/(n1+1))),point(n2,(.05/m)**(1/(n2+1)))],fill='black',width=5)
for n,m in [(13,1),(16,2),(19,4)]:
 x,y=point(n,(.05/m)**(1/(n+1)));d.ellipse((x-8,y-8,x+8,y+8),fill='black');d.line((x,y,x,B),fill='#888888',width=2)
 centered(d,(x,y-35),str(n),font(33,True))
y=point(0,.8)[1]
for x in range(L,R,24):d.line((x,y,min(x+11,R),y),fill='#666666',width=3)
d.text((L+25,y+12),'Порог τ = 0,8',font=font(33),fill='black')
centered(d,((L+R)/2,930),'Число независимых безошибочных подтверждений n на предпосылку',font(39))
d.text((L,15),'Нижняя граница q',font=font(37),fill='black')
for i,(txt,kind) in enumerate([('m = 1','solid'),('m = 2','dash'),('m = 4','dot')]):
 x=1120+i*230;y=120
 for j in range(100):
  if kind=='dash' and j%30>=20:continue
  if kind=='dot' and j%16>=6:continue
  d.line((x+j,y,x+j+1,y),fill='black',width=5)
 d.text((x+113,y-24),txt,font=font(35),fill='black')
im.save(BASE/'quantiles.png',dpi=(300,300))
print('Figures saved')
