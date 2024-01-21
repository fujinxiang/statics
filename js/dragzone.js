function dragzone(domId, callback) {
    const zone = document.getElementById(domId);
    if (!zone) {
      console.log(`${domId} is not exist`);
      return;
    }

    function openSelect(event) {
      // 创建一个文件选择控件
      const fileSelect = document.createElement('input');
      fileSelect.type = 'file';
      //   fileSelect.accept = '.mp3,.mp4';

      fileSelect.addEventListener('change', (e) => {
        const file = e?.target.files[0];
        callback(file);
      });
      fileSelect.click();
    }

    zone.removeEventListener('click', openSelect);
    zone.addEventListener('click', openSelect);

    zone.addEventListener('dragover', function (event) {
      event.preventDefault();
    });

    function domDrop(event) {
      event.preventDefault();
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        callback(file);
      }
    }

    zone.removeEventListener('drop', domDrop);
    zone.addEventListener('drop', domDrop);

    function documentPaste(event) {
      let items = event.clipboardData && event.clipboardData.items;
      let file = null;
      if (items && items.length) {
        for (let i = 0; i < items.length; i++) {
          console.log(items[i].type);
          if (items[i].type.indexOf('image') !== -1) {
            file = items[i].getAsFile();
            callback(file);
          }
          if (items[i].type.indexOf('text') !== -1) {
            items[i].getAsString((result) => {
              console.log(result);
            });
          }
        }
      }
    }

    document.removeEventListener('paste', documentPaste);
    document.addEventListener('paste', documentPaste);

    function fileToDataUrl(file) {
      var reader = new FileReader();
      reader.onload = function (event) {
        console.log(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }
