var generatedData = ""

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('download').addEventListener('click', async function (event) {
        event.preventDefault();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(12);
        const element = document.getElementById("generatedContent");

        doc.html(element, {
            callback: function (doc) {
                doc.save("div-content.pdf");
            },
            x: 15,
            y: 15,
            html2canvas: {
                scale: 0.25,
            },
            autoPaging: 'text',
            width: 100,
            windowWidth: 700
        });
    })

    const comp1 = document.getElementById("completed-icon-1");
    const loader1 = document.getElementById("loading-icon-1");
    const comp2 = document.getElementById("completed-icon-2");
    const loader2 = document.getElementById("loading-icon-2");
    const go1 = document.getElementById("go-icon-2");
    comp1.style.display = "none";
    comp2.style.display = "none";
    loader2.style.display = "none";
    loader1.style.display = "none";


    document.getElementById('infoForm').addEventListener('submit', async function (event) {
        event.preventDefault();

        const webpageUrl = document.getElementById('webpageUrl').value;
        const clickedButton = event.submitter.id;
        let response;
        if (clickedButton === 'fillFormButton') {
            console.log("popform.js success");
            loader1.style.display = "block";
            response = await fetch('/scrape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: webpageUrl, action: 'fillForm' })
            });
            if (response.ok) {
                const data = await response.json();
                console.log(data);
                document.getElementById('companyName').value = data.extractedInfo.companyName;
                document.getElementById('typeOfProduct').value = data.extractedInfo.typeOfProduct;
                document.getElementById('idealUser').value = data.extractedInfo.idealUser;
                loader1.style.display = "none";
                comp1.style.display = "block";
            } else {
                console.error('Failed to fetch form data');
            }

        } else if (clickedButton === 'generateContentButton') {
            loader2.style.display = "block";
            go1.style.display = "none";
            const companyName = document.getElementById('companyName').value;
            const productName = document.getElementById('typeOfProduct').value;
            const idealUser = document.getElementById('idealUser').value;
            console.log(companyName, productName, idealUser);
            response = await fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    companyName: companyName,
                    productName: productName,
                    idealUser: idealUser,
                    action: 'generateContent'
                })
            });

            if (response.ok) {
                const data = await response.json();
                const contentContainer = document.getElementById('generatedContent');
                generatedData = data.generatedContent
                contentContainer.innerHTML = generatedData.tweets
                loader2.style.display = "none";
                comp2.style.display = "block";
            } else {
                console.error('Failed to fetch generated content');
            }
        }
    });



    document.getElementById('twitter').addEventListener('click', async function (event) {
        event.preventDefault();
        var converter = new showdown.Converter();
        let html = converter.makeHtml(generatedData.tweets);
        console.log(html);
        let parent = document.getElementById('generatedContent')
        parent.innerHTML = ''
        let child = document.createElement('div')
        child.innerHTML = html
        parent.appendChild(child)
    })

    document.getElementById('blog').addEventListener('click', async function (event) {
        event.preventDefault();
        var converter = new showdown.Converter();
        let html = converter.makeHtml(generatedData.blogs);
        console.log(html);
        let parent = document.getElementById('generatedContent')
        parent.innerHTML = ''
        let child = document.createElement('div')
        child.innerHTML = html
        parent.appendChild(child)
        console.log(generatedData.posts);
    })

    document.getElementById('instagram').addEventListener('click', async function (event) {
        event.preventDefault();
        var converter = new showdown.Converter();
        let html = converter.makeHtml(generatedData.posts);
        console.log(html);
        let parent = document.getElementById('generatedContent')
        parent.innerHTML = ''
        let child = document.createElement('div')
        child.innerHTML = html
        parent.appendChild(child)
        console.log(generatedData.posts);
    })

});

