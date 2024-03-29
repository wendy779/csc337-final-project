/**
 * Author: Aerror Li, Lingxiao Meng
 * Class: CSC337 
 * Purpose: the js for seraching job information
 * by job title, select company filter, apply job. 
 */
var searchResult = []

// apply jobs under the information
function applyJob(){
	var compName = $('#companyName').val(); //todo: get the certain comp name
	console.log('here');
	console.log(compName);
	var title = $('#jobTitle').val();

	$.ajax({
		url: '/job/apply',
		method: 'POST',
		data:{
			companyName: compName,
			jobTitle: title
		},
		success: function(result){
			if(result == 'yes'){
				alert('Success to apply for the job!');
			}else{
				alert('Please log in first');
			}
		}
	});
}

//select jobs by different company's name
function selectComp(name){
	$('#outputArea').empty();
	var renderHtml = '';
	
	for(var i=0;i<searchResult.length;i++){
		var job = searchResult[i];
		if(job.compName == name){
		
		renderHtml+=`<ul>
	<li>
		<h3 id="companyName">${job.compName}</h3>
		<p id="jobTitle">${job.jobTitle}</p>
		<p>${job.jobArea}</p>
		<input type="button" value="Apply" onclick="applyJob()"></input>
	</li>
</ul>`
		}
	}

	$('#outputArea').html(renderHtml);
}

//use job title to search jobs from database
function searchByTitle() {
    let item = $('#searchbar').val();
 
	$.ajax({
        url: '/job/searchByTitle',
        data: {
            jobTitle: item,
        },
        method: 'POST',
        success: function(result){
			var compList=new Set();
			// console.log(result);
			
			$('#outputArea').empty();
			var renderHtml = '';
			var renderCompHtml = '';
			var joblist = JSON.parse(result);
			searchResult = joblist;
			for(var i=0;i<joblist.length;i++){
				var job = joblist[i];
				compList.add(job.compName);
				
				renderHtml+=`<ul>
            <li>
                <h3 id="companyName">${job.compName}</h3>
                <p id="jobTitle">${job.jobTitle}</p>
                <p>${job.jobArea}</p>
                <input type="button" value="Apply" onclick="applyJob()"></input>
            </li>
        </ul>`
			}
			if(joblist.length == 0){
				
            $('#outputArea').html("not found");
			}else
            $('#outputArea').html(renderHtml);
			
			for (var comp of compList){
				renderCompHtml+=` <li><a onclick="selectComp(\'${comp}\')" >${comp}</a></li>`
			}
			 $('#compList').html(renderCompHtml);
        }
    })
}

