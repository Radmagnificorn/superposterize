class SPoster {

    fileSelect = null;
    ctx;
    loadedImage = new Image();

    valueSliders = [];

    initialize() {
        this.fileSelect = document.getElementById('fileSelect');
        this.canvas = document.getElementById('imageDisplay');
        this.ctx = this.canvas.getContext('2d');
        this.sampleCharacter = document.querySelector('#sampleCharacter');
        this.showGuySelect = document.querySelector('#toggleGuy');

        this.ctx.imageSmoothingEnabled = false;


        document.getElementById('testButton').addEventListener('click', this.applyEffect.bind(this));
        document.getElementById('resetButton').addEventListener('click', this.resetImage.bind(this));
        document.getElementById('downloadImage').addEventListener('click', this.downloadCanvas.bind(this));

        this.valueSliders = document.querySelectorAll(".valueSlider");
        this.valueSliders.forEach(slider => {
            slider.onchange = () => this.applyEffect();
        });

        this.loadedImage.addEventListener('load', this.drawLoadedImageToCanvas.bind(this));

        this.fileSelect.onchange = e => {
            
            this.loadedImage.src = URL.createObjectURL(e.target.files[0]);

        }

        
    }

    applyEffect() {
        this.resetImage();

        let valueRanges = Array.from(this.valueSliders, slider => Number(slider.value));
        //let valueRanges = [0.1, 0.2, 0.5, 0.8, 0.9];
        valueRanges.sort((a, b) => a - b);
        console.log(valueRanges);
        

        let hSplit = document.getElementById('hSplit').value;
        let sSplit = document.getElementById('sSplit').value;

        let margin = document.getElementById('margin').value;

        let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        let data = imageData.data;

        for (let i=0; i<imageData.data.length; i += 4) {
            let r = data[i];
            let g = data[i+1];
            let b = data[i+2];
            let a = data[i+3];

            let hsl = this.rgbToHsl(r, g, b);
            hsl.h = this.round(hsl.h, hSplit, 0);
            hsl.s = this.round(hsl.s, sSplit, 0);
            hsl.l = this.stratify(hsl.l, valueRanges, margin);

            let rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
            data[i] = rgb.r;
            data[i+1] = rgb.g;
            data[i+2] = rgb.b;
        }

        this.ctx.putImageData(imageData, 0, 0);

        if (this.showGuySelect.checked) {
            this.ctx.drawImage(this.sampleCharacter, (this.canvas.width / 2) - this.sampleCharacter.width / 2, (this.canvas.height / 2) - this.sampleCharacter.height / 2);
        }
    }

    resetImage() {
        this.drawLoadedImageToCanvas();
    }

    drawLoadedImageToCanvas() {

        let scale = document.querySelector('#scale').value;

        const img = this.loadedImage;
        this.canvas.height = img.height / scale;
        this.canvas.width = img.width / scale;

        this.ctx.imageSmoothingEnabled = false;
        
        this.ctx.drawImage(img, 0, 0, img.width / scale, img.height / scale);

    
        this.canvas.style.width = '100%';
        this.ctx.imageSmoothingEnabled = false;

    }

    downloadCanvas() {
        var anchor = document.createElement('a');
        anchor.href = this.canvas.toDataURL('image/png');
        anchor.download = 'image.png';
        anchor.click();
    }

    stratify(number, ranges, margin) {
        margin = margin == null ? 0 : margin;

        let result = number;
        for (const range of ranges) {
            let totalRange = Number(range) + Number(margin);
            if (number <= totalRange) {
                result = number <= range ? range : number;
                break;
            }
        }

        return result;
    }

    round(number, increment, offset) {
        return Math.ceil((number - offset) / increment ) * increment + offset;
    }

    rgbToHsl(r, g, b) {
        r /= 255, g /= 255, b /= 255;
      
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;
      
        if (max == min) {
          h = s = 0; // achromatic
        } else {
          var d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
      
          h /= 6;
        }
    
        return { h: h, s: s, l: l };
    }         
  
    hslToRgb(h, s, l) {
        var r, g, b;
      
        if (s == 0) {
          r = g = b = l; // achromatic
        } else {
          function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          }
      
          var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          var p = 2 * l - q;
      
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }
    
        return { r: r * 255, g: g * 255, b: b * 255 };
    }
}

new SPoster().initialize();