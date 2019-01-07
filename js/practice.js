
document.addEventListener("DOMContentLoaded", function() {
    var practiceButton = document.getElementById("practice");
    practiceButton.onclick = function () {
        document.getElementById("back").style.display = 'block';
        document.getElementById("left").style.display = 'none';
        document.getElementById("right").style.display = 'none';
        document.getElementById("top-center").style.display = 'none';
        document.getElementById("main").style.display = "grid";
        document.getElementById("choose-name").style.display = "none";
        document.getElementById("main").style.gridTemplateColumns = "auto auto auto";
        document.getElementById('drawing-box').classList.add("practice");

        setupCanvas();
        setPractice(true);
        turnStart(-1);
    };

    var backButton = document.getElementById("back");
    backButton.onclick = function () {
        location.reload();
    };
});