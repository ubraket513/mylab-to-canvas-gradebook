# import necessary modules
import os, sys
import numpy as np
import pandas as pd
import re, math
from canvasapi import Canvas
from InquirerPy import prompt

# Environmental PATH Variables
API_URL="https://psu.instructure.com/"
API_KEY = input("Please enter your Canvas API Key:")
base_path = os.path.dirname(os.path.realpath(__file__))
MYLAB_GRADEBOOK_LOC      = os.path.join(base_path, 'mylab.csv')
CANVAS_OLD_GRADEBOOK_LOC = os.path.join(base_path, 'canvas.csv')
CANVAS_NEW_GRADEBOOK_LOC = os.path.join(base_path, 'new_canvas_gradebook.csv')

def authenticateCanvas():
    # Initialize Canvas API
    canvas_app = Canvas(API_URL, API_KEY)
    # Create an empty DataFrame to store courses
    course_df = pd.DataFrame(columns=["course name", "course id"])
    # Retrieve courses and add to the DataFrame
    for course in canvas_app.get_courses(enrollment_type="ta", state=["available"]):
        try:
            access = course.access_restricted_by_date  # Checking for access restriction
        except:
            # If no access restrictions, add the course to the DataFrame
            name = course.name
            sid = course.id
            course_df.loc[len(course_df)] = [name, sid]
    # If no courses are available, notify and exit
    if course_df.empty:
        print("No available courses found.")
        return
    # Prepare choices for user to select courses using arrow keys
    course_choices = [{"name": f"{row['course name']} (ID: {row['course id']})", "value": row['course id']} 
                      for _, row in course_df.iterrows()]
    # Add an exit option
    course_choices.append({"name": "Exit", "value": "exit"})
    # Prompt user to select a course
    course_question = [
        {
            "type": "list",
            "message": "Select a course to grade (or Exit):",
            "choices": course_choices,
            "name": "selected_course"
        }
    ]
    # Get the selected course ID
    course_answer = prompt(course_question)
    # Check if the user wants to exit
    if course_answer["selected_course"] == "exit":
        print("Program terminated.")
        return
    selected_id = course_answer["selected_course"]
    course = canvas_app.get_course(selected_id)
    # Assignment group and assignment selection
    while True:
        # Get and display assignment groups
        assignment_groups = course.get_assignment_groups()
        assignment_group_choices = [{"name": str(group), "value": group.id} for group in assignment_groups]
        # Add an exit option
        assignment_group_choices.append({"name": "Exit", "value": "exit"})
        # Prompt user to select an assignment group
        assignment_group_question = [
            {
                "type": "list",
                "message": "Select an assignment group (or Exit):",
                "choices": assignment_group_choices,
                "name": "selected_assignment_group"
            }
        ]
        assignment_group_answer = prompt(assignment_group_question)
        # Check if the user wants to exit
        if assignment_group_answer["selected_assignment_group"] == "exit":
            print("Program terminated.")
            return
        selected_assignment_group_id = assignment_group_answer["selected_assignment_group"]
        # Get and display assignments within the selected group
        assignments = course.get_assignments_for_group(selected_assignment_group_id)
        assignment_choices = [{"name": str(assignment), "value": assignment.id} for assignment in assignments]
        # Add an exit option
        assignment_choices.append({"name": "Exit", "value": "exit"})
        # Prompt user to select an assignment
        assignment_question = [
            {
                "type": "list",
                "message": "Select an assignment to grade (or Exit):",
                "choices": assignment_choices,
                "name": "selected_assignment"
            }
        ]
        assignment_answer = prompt(assignment_question)
        # Check if the user wants to exit
        if assignment_answer["selected_assignment"] == "exit":
            print("Program terminated.")
            return
        selected_assignment_id = assignment_answer["selected_assignment"]
        # Confirmation prompt
        confirmation_message = (
            f"You selected to grade assignment group {course.get_assignment_group(selected_assignment_group_id)}"
            f" > {course.get_assignment(selected_assignment_id)}"
        )
        print(confirmation_message)
        # Ask for confirmation
        confirm_question = [
            {
                "type": "confirm",
                "message": "Please confirm your selection (or Exit)",
                "name": "confirm_selection",
                "default": False
            }
        ]
        confirm_answer = prompt(confirm_question)
        if confirm_answer["confirm_selection"]:
            return int(selected_assignment_id)  # Return the selected assignment ID for grading
        else:
            print("Selection not confirmed. Restarting the selection process.")
            continue

def preprocessCanvas(assignment):
    drop_list = []
    # Read the Canvas gradebook CSV file
    canvas_old = pd.read_csv(CANVAS_OLD_GRADEBOOK_LOC)
    # Initialize the assignment index variable
    assignment_index = None
    # Select the name of the assignment column
    for column_name in canvas_old.columns:
        if str(assignment) in column_name:
            assignment_index = column_name
        elif column_name not in ["SIS Login ID", "Student"]:
            drop_list.append(column_name)
    # Ensure that the assignment column was found
    if assignment_index is None:
        raise ValueError(f"Assignment '{assignment}' not found in the Canvas gradebook.")
    # Preprocess DataFrame: drop irrelevant columns
    canvas_old.drop(labels=drop_list, inplace=True, axis=1)
    # Drop the first two rows (header rows in Canvas gradebook)
    canvas_old.drop(labels=[0, 1], inplace=True, axis=0)
    # Rename columns for easier access
    canvas_old.rename(columns={"Student": "Name", "SIS Login ID": "Email"}, inplace=True)
    # Rename the third column (assumed to be the assignment score) to "Final"
    canvas_old.rename(columns={assignment_index: "Final"}, inplace=True)
    # Drop the last row, which might contain totals or other metadata
    canvas_old.drop(canvas_old.tail(1).index, inplace=True)
    # Fill any missing values with 0.0 (in case there are empty grades)
    canvas_old.fillna(0.0, inplace=True)    
    return canvas_old

def preprocessMylab():
    """
    Given a MyLab Math gradebook csv file, it converts it into a Pandas DataFrame with dropping unnecessary columns
    """
    mylab = pd.read_csv(MYLAB_GRADEBOOK_LOC)
    mylab.drop(labels=mylab.columns[[0, 1, 3, 4]], inplace=True, axis=1)
    grade_weight_df = mylab.iloc[1][1:3] # this is a pandas dataframe that has the following structure
    # first column is the name of the section of the assignment. second column is the grade weight of that selected section.
    mylab.drop(labels=[0, 1, 2, 3], inplace=True, axis=0)
    mylab.rename(columns={"Unnamed: 2": "Email"}, inplace=True)
    mylab.drop(mylab.tail(7).index, inplace=True)
    mylab.fillna(0.0, inplace=True)
    return mylab

def getMyLabWeights():
    """
    Given a MyLab Math gradebook CSV file, it converts it into a Pandas DataFrame with the option
    to modify the grading weight for each section directly through the terminal.
    """
    mylab = pd.read_csv(MYLAB_GRADEBOOK_LOC)  # Read the MyLab CSV file
    mylab.drop(labels=mylab.columns[[0, 1, 3, 4]], inplace=True, axis=1)  # Drop unnecessary columns
    grade_weight_df = mylab.iloc[1][1:3]  # Extract the grade weight DataFrame
    # Ask user if they want to modify each section's weight
    for section, weight in grade_weight_df.items():
        modify = input(f"Modify the current grade weight {weight} points for MyLab Math Section {section}? (y/n): ").lower()
        if modify == 'y':
            new_weight = input(f"Enter the new weight for section {section}: ")
            try:
                new_weight = float(new_weight)
                grade_weight_df[section] = new_weight  # Update the weight in the DataFrame
                print(f"Weight for section {section} updated to {new_weight}")
            except ValueError:
                print("Invalid input. Skipping modification for this section.")    
    # Convert to list and return
    return list(map(lambda x: int(x), grade_weight_df.tolist()))


def adjust(vector, max_scale):
    """
    Rescale the vector of mylab scores (0 <= x_i <= 1) to be out of max_scale.
    If the grade x_i >= 0.8 (at least 80% achievement on mylab math), it will be marked as a full score.
    """
    vector = np.array(vector)  # Convert to a NumPy array for faster operations
    rescaled = np.where(vector >= 0.8, max_scale, max_scale * (np.ceil((vector + 0.2) * 10) / 10.0))
    return rescaled.tolist()

# Match Email address
def matchUserInfo(Canvas, MyLab, assignment):
    mylab_normalize = pd.read_csv(MYLAB_GRADEBOOK_LOC)
    mylab_normalize.drop(
        labels=mylab_normalize.columns[[3, 4, 5, 6]], inplace=True, axis=1
    )
    mylab_normalize.drop(labels=[0, 1, 2, 3], inplace=True, axis=0)
    mylab_normalize.rename(
        columns={"Unnamed: 2": "Email", "Unnamed: 0": "First", "Unnamed: 1": "Last"},
        inplace=True,
    )
    mylab_normalize.drop(mylab_normalize.tail(7).index, inplace=True)
    # normalize the non-psu email to psu email
    regex = r"[A-Za-z0-9]*@psu.edu$"
    for email in mylab_normalize["Email"]:
        if not re.match(regex, email):
            # First and Last name of a student who has non-psu email on their MyLab account
            student_info = mylab_normalize.loc[mylab_normalize["Email"] == email]
            student_first_name = (
                student_info["First"].to_numpy()[0].strip().lower().replace("'", "")
            )
            student_last_name = (
                student_info["Last"].to_numpy()[0].strip().lower().replace("'", "")
            )
            # Search for the name from canvas_old database
            for name in Canvas["Name"]:
                canvas_name = (
                    Canvas.loc[Canvas["Name"] == name]
                    .to_numpy()
                    .flatten()[0]
                    .strip()
                    .lower()
                    .replace("'", "")
                    .replace(".", "")
                )
                psu_email = (
                    Canvas.loc[Canvas["Name"] == name]
                    .to_numpy()
                    .flatten()[1]
                    .strip()
                    .lower()
                )
                if (student_first_name in canvas_name) and (
                    student_last_name in canvas_name
                ):
                    MyLab.replace(email, psu_email, inplace=True)
    return MyLab


def sumScores(canvas_new, Canvas, MyLab, assignment):
    # New Canvas gradebook
    assignment_index = ""
    # Select the column with a name that includes assignment id
    for column_name in canvas_new.iloc[[0]]:
        if str(assignment) in column_name:
            assignment_index = column_name
    # search student record from MyLab Math via email field
    for email in MyLab["Email"]:
        # Select each row of the mylab
        mylab_score = float(MyLab.loc[MyLab["Email"] == email]["Final"].to_numpy()[0])
        # Select the row corresponding to the email from copy of Canvas gradebook
        try:
            canvas_score = float(Canvas.loc[Canvas["Email"] == email].to_numpy()[0][2])
        except:
            print(
                "   • User "
                + email
                + " on MyLab is inactive and does not exist on Canvas page"
            )
        # Calculate the final score
        final_score = round(mylab_score + canvas_score, 1)
        # Replace this final score into new canvas gradebook
        canvas_new.loc[
            canvas_new["SIS Login ID"] == email, assignment_index
        ] = final_score
    return canvas_new


def executable():
    assignment = authenticateCanvas()
    if assignment == 0:
        return 0
    Canvas = preprocessCanvas(assignment=assignment)
    canvas_new = pd.read_csv(CANVAS_OLD_GRADEBOOK_LOC)
    MyLab = preprocessMylab()
    MyLab = matchUserInfo(Canvas=Canvas, MyLab=MyLab, assignment=assignment)
    weights = getMyLabWeights()
    MyLabAdjusted = np.zeros(len(MyLab.iloc[:, [0]]))
    for i in range(len(weights)):
        MyLabAdjusted += adjust(
                (MyLab.iloc[:, [i+1]].to_numpy().flatten().astype(float).tolist()),
                max_scale=weights[i],
            )
    MyLab["Final"] = MyLabAdjusted
    canvas_new = sumScores(
        canvas_new=canvas_new, Canvas=Canvas, MyLab=MyLab, assignment=assignment
    )
    canvas_new.to_csv(CANVAS_NEW_GRADEBOOK_LOC, index=False)
    return 0


executable()
