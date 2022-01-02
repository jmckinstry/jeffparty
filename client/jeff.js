var multiplayer_connection = null

var row1 = [200,400,600,800,1000]
var row2 = []
row1.forEach(r=>row2.push(r*2))

var body_header

var body_left
var body_left_second
var body_middle
var body_right

var body_footer

var element_checkbox_for_real
var element_text_daily_double
var element_text_current_value
var element_text_answers_given
var element_text_answers_correct
var element_text_answer_percentages
var element_text_running_total
var element_text_answers_given_with_guesses
var element_text_answer_percentages_with_guesses
var element_text_running_total_with_guesses

var element_text_multiplayer_name
var element_text_multiplayer_lobby
var element_button_connect
var element_button_disconnect
var element_list_chat

function f_make_input_button(id, function_name, words, default_function_input) {
	var s = "<input id='" + id + "' type='button' value='" + words + "' "
	s += "onclick='f_button_" + function_name + "(" + (default_function_input ? default_function_input : id) + ")' />"
	return s
}
function f_make_input_checkbox(id) {
	return "<input id='" + id + "' type='checkbox' />"
}
function f_make_input_text(id, placeholder="") {
	return "<input id='" + id + "' type='text' placeholder='" + placeholder + "' />"
}

function f_make_row_into_lines_html(rows) {
	var inner_text = ""
	for (i = 0; i < rows.length; i++) {
		inner_text += "<tr><td>" + f_make_input_button(rows[i], "money_clicked", "$"+rows[i]) + "</td></tr>"
	}
	return inner_text
}

function f_reset_all_values() {
	element_checkbox_for_real.checked = true
	element_text_daily_double.value = ""
	
	element_text_current_value.innerText = "$0"
	
	element_text_answers_given.innerText = "0"
	element_text_answers_correct.innerText = "0"
	element_text_answer_percentages.innerText = ""
	element_text_running_total.innerText = "$0"
	
	element_text_answers_given_with_guesses.innerText = "0"
	element_text_answers_correct_with_guesses.innerText = "0"
	element_text_answer_percentages_with_guesses.innerText = ""
	element_text_running_total_with_guesses.innerText = "$0"
	
	body_right.hidden = false
}

function f_build_page() {
	// Header
	body_header = document.getElementById('header')
	
	// Body
	body_left = document.getElementById('body_left')
	body_left_second = document.getElementById('body_left_second')
	body_middle = document.getElementById('body_middle')
	body_right = document.getElementById('body_right')
	
	// Add the First Round buttons to body_left
	body_left.innerHTML = "<table id='body_table_left_buttons'>" + f_make_row_into_lines_html(row1) + "</table>"
	// Add the Second Round buttons to body_left_second
	body_left_second.innerHTML = "<table id='body_table_left_second_buttons'>" + f_make_row_into_lines_html(row2) + "</table>"
	
	//Add the daily doubles, serious/not toggle, and got it right/missed it buttons
	body_middle.innerHTML = "<table id='body_middle_buttons'><tr>"
		+ "<td>" + f_make_input_button("daily_double", "daily_double_clicked", "Daily Double!") + "</td>"
			+ "<td>" + f_make_input_text("text_daily_double", "Daily Double Value") + "</td></tr>"
		+ "<tr><td>&nbsp</td></tr>"
		+ "<tr><td>Current Value:</td><td id='body_middle_current_value'></td></tr>"
		+ "<tr><td>&nbsp</td></tr>"
		+ "<tr><td>Real guess:</td><td>" + f_make_input_checkbox('real_guess') + "</td></tr>"
		+ "<tr><td>" + f_make_input_button("body_middle_got_it_yes", "answered", "Answered Right!", "true") + "</td>"
			+ "<td>" + f_make_input_button("body_middle_got_it_no", "answered", "Answered Wrong...", "false") + "</td></tr>"
	
	// Add the multiplayer box on the right
	body_right.innerHTML = "<table><tr><td><h4>Multiplayer Jeffparty!</h4></td></tr>"
		+ "<tr><td>" + f_make_input_button("body_right_button_connect", "multiplayer_connect", "Connect") + "</td>"
			+ "<td>" + f_make_input_button("body_right_button_disconnect", "multiplayer_disconnect", "Disconnect") + "</td></tr>"
		+ "<tr><td>Name:</td><td>" + f_make_input_text('multiplayer_name') + "</td></tr>"
		+ "<tr><td>Lobby:</td><td>" + f_make_input_text('multiplayer_lobby', 'Main') + "</td></tr>"
		+ "</table>"
		+ "<div id='multiplayer_log'><ul id='multiplayer_log_list' /></div>"
	
	// Footer Totals
	body_footer = document.getElementById('footer')
	body_footer.innerHTML = "<table>"
		+ "<tr><td>Answers Given</td><td id='body_footer_answers_given'></td></tr>"
		+ "<tr><td>Answers Correct</td><td id='body_footer_answers_correct'></td><td id='body_footer_answer_percentages'></td></tr>"
		+ "<tr><td>Running Total</td><td id='body_footer_running_total'></td></tr>"
		+ "<tr><td>&nbsp</td></tr>"
		+ "<tr><td>Answers Given w/Guesses</td><td id='body_footer_answers_given_guesses'></td></tr>"
		+ "<tr><td>Answers Correct w/Guesses</td><td id='body_footer_answers_correct_guesses'></td><td id='body_footer_answer_percentages_with_guesses'></td></tr>"
		+ "<tr><td>Running Total w/Guesses</td><td id='body_footer_running_total_guesses'></td></tr>"
		
		+ "<tr><td>" + f_make_input_button('share', 'share', 'Share Totals') + "</td>"
			+ "<td /><td>" + f_make_input_button('reset', 'reset', "!!!RESET!!!") + "</div></td></tr>"
		+ "</table>"
		
	
	// Hook up our io elements
	element_checkbox_for_real = document.getElementById('real_guess')
	
	element_text_daily_double = document.getElementById('text_daily_double')
	element_text_current_value = document.getElementById('body_middle_current_value')
	element_text_answers_given = document.getElementById('body_footer_answers_given')
	element_text_answer_percentages = document.getElementById('body_footer_answer_percentages')
	element_text_answers_correct = document.getElementById('body_footer_answers_correct')
	element_text_running_total = document.getElementById('body_footer_running_total')
	element_text_answers_given_with_guesses = document.getElementById('body_footer_answers_given_guesses')
	element_text_answers_correct_with_guesses = document.getElementById('body_footer_answers_correct_guesses')
	element_text_answer_percentages_with_guesses = document.getElementById('body_footer_answer_percentages_with_guesses')
	element_text_running_total_with_guesses = document.getElementById('body_footer_running_total_guesses')
	
	element_text_multiplayer_name = document.getElementById('multiplayer_name')
	element_text_multiplayer_lobby = document.getElementById('multiplayer_lobby')
	element_button_connect = document.getElementById('body_right_button_connect')
	element_button_disconnect = document.getElementById('body_right_button_disconnect')
	element_list_chat = document.getElementById('multiplayer_log_list')
	
	// Load defaults
	f_reset_all_values()
	f_multi_set_enabled(false)
}

function f_money_to_int(money) {
	money = "" + money
	var trimmed = parseInt(money.replace(/[^\-0-9]/i, ''))
	return (trimmed ? trimmed : 0)
}

function f_handle_guess(guess_was_right, real_guess, amount) {	
	var guess_value = 0
	if (guess_was_right) {
		guess_value += 1
		}
	else {
		amount *= -1
	}
		
	if (real_guess) {
		element_text_answers_given.innerText = parseInt(element_text_answers_given.innerText) + 1
		element_text_answers_correct.innerText = parseInt(element_text_answers_correct.innerText) + guess_value
		element_text_running_total.innerText = "$" + (f_money_to_int(element_text_running_total.innerText) + amount)
	}
	
	element_text_answers_given_with_guesses.innerText = parseInt(element_text_answers_given_with_guesses.innerText) + 1
	element_text_answers_correct_with_guesses.innerText = parseInt(element_text_answers_correct_with_guesses.innerText) + guess_value
	element_text_running_total_with_guesses.innerText = "$" + (f_money_to_int(element_text_running_total_with_guesses.innerText) + amount)
	
	// Percentages update
	element_text_answer_percentages.innerText = (element_text_answers_correct.innerText*100 / element_text_answers_given.innerText).toFixed(2) + "%"
	element_text_answer_percentages_with_guesses.innerText = (element_text_answers_correct_with_guesses.innerText*100 / element_text_answers_given_with_guesses.innerText).toFixed(2) + "%"
	
	f_websocket_submit_answer({
		name:element_text_multiplayer_name.value,
		guessed:!real_guess,
		right:guess_was_right,
		amount:Math.abs(amount),
	})
}

// UI Functions

function f_button_money_clicked(value) {
	document.getElementById('body_middle_current_value').innerHTML = "$" + value
}
function f_button_daily_double_clicked() {
	element_text_current_value.innerText = "$" + f_money_to_int(element_text_daily_double.value)
	element_text_daily_double.value = ""
}
function f_button_answered(got_it) {
	f_handle_guess(got_it, element_checkbox_for_real.checked, f_money_to_int(element_text_current_value.innerText))
}
function f_button_share() {
	if (element_text_answers_given_with_guesses.innerText > 0) {
		data = {
			name:element_text_multiplayer_name.value,
			answers: {
				given:element_text_answers_given.innerText,
				correct:element_text_answers_correct.innerText,
				total:element_text_running_total.innerText,
				percent:element_text_answer_percentages.innerText
			},
			guesses: {
				given:element_text_answers_given_with_guesses.innerText,
				correct:element_text_answers_correct_with_guesses.innerText,
				total:element_text_running_total_with_guesses.innerText,
				percent:element_text_answer_percentages_with_guesses.innerText
			},
		}
		f_websocket_send('summary', data)
}
function f_button_reset() {
	if (window.confirm("Are you sure you want to reset everything?")) {
			f_reset_all_values()
		}
	}
}
