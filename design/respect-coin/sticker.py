import qrcode, numpy as np, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle
from matplotlib.font_manager import FontProperties
F=FontProperties(fname="/tmp/coin/sofia-900.ttf"); M=FontProperties(family="DejaVu Sans Mono", weight="bold")
img=plt.imread("/tmp/coin/preview-back.png")
q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,border=1); q.add_data("https://mafiacl.com/respect?code=K7P2QX9M"); q.make()
mat=np.array(q.get_matrix())
fig=plt.figure(figsize=(9,9),dpi=100); ax=fig.add_axes([0,0,1,1]); ax.imshow(img,extent=(-21,21,-21,21)); ax.set_xlim(-21,21); ax.set_ylim(-21,21); ax.axis("off")
ax.add_patch(Circle((0,0),15.0,color="white",zorder=2))
size=18; n=mat.shape[0]; m=size/n; x0=-size/2; y0=-size/2+0.8
for i in range(n):
  for j in range(n):
    if mat[i,j]: ax.add_patch(Rectangle((x0+j*m, y0+(n-1-i)*m), m*1.02, m*1.02, color="#111", lw=0, zorder=3))
ax.text(0,11.9,"10 RESPECT",ha="center",va="center",fontproperties=F,fontsize=30,color="#7a1020",zorder=4)
ax.text(0,-10.9,"K7P2QX9M",ha="center",va="center",fontproperties=M,fontsize=24,color="#111",zorder=4)
fig.savefig("/tmp/coin/preview-back-sticker.png")
