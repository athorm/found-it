# TO DO LIST
## General Improvements (Priority 1 - required)
- [x] Fix the upload button when on message page
- [x] Implement logic on Home Page searching item going to item search page to show matched search items
- [x] Ability to change password on profile page
- [x] Make an (i) button on Home Page so that when its pressed a window would pop up just like modals explainiing what the website is all about and what you can do with it
- [x] Delete chat when item is resolved (Have the user that posted the item press the button to delete the chat, this way if the user deleted the item it would be deleted for both users--not just both but multiple users when viewing on Item Page)
- [x] Check if there is an active session since I noticed that whenever the server is first run the local host will go to login but when changed to /Home it remembers the session
- [x] Fix Mark as Claimed/Unclaimed bug — button text now updates instantly (optimistic update, no page refresh needed)

## Feature Improvements (Priority 2 - nice to have)
- [x] Showing how many (numbers or dots if numbers cannot be done) messages in chat navbar. When all the messages are read, the bubble should disappear or just show nothing
- [x] When choosing lost on the drop down box of the post page.js, Instead of having the text on Item Title being "What did you find?" It changes automatically in real time to "What did you lose?"
<!-- - [x] Make the item picture in the Item Page when you click the image, it would enlarge the image for the user so that they can see the item better.
<!-- - [x] When no active session in local host, changing it to /Home or any other pages it should go to login page instead of going to the page you are trying to visit. -->
<!-- - [x] In Home page, instead of having a Go button change it to search icon button. So when the user presses the search button, it would show the matched search items in the item page. -->
<!-- - [x] Add a confirmation process on both users when an item is resolved. After the item is claimed, there should be a button that says "Mark as Resolved". When pressed, it would send a request to the user that posted the item to confirm if the item is resolved. If both users confirm that the item is resolved, users cannot message the poster anymore and after a few days it will be deleted from the database. Use Supabase for it. -->
<!-- - [x] When clicking my post button on item page, instead of having a text that says "No Item Posted Yet" change it to something like "You haven't posted any items yet" because the icon of the my post button doesn't seem to indicate that its a my post button. Suggest a redesign that would indicate that its a my post button so that user don't get confused. -->
<!-- - [x] Ability of users to delete their posted items. When pressed, it would ask the user to confirm if they really want to delete the item. If yes, it would be deleted from the database. -->
<!-- - [x] Since we already have an automatic message system, it's only about if the item is available. Let's implement that when the user posted on the Lost item and the finder message that poster, instead of asking "Is this still available?", it says "Is this your item?" Allowing the users to upload image in messages. I think we need to implement this also in Supabase creating another table for chat images. -->
<!-- - [x] When clicking the plus button on the navbar, it shows the option of Camera or Gallery. But when running the website on chrome desktop and only inspecting to make a mobile view. When clicking Camera or Gallery, it will just open a file explorer. It should open the camera or gallery of the device. How do we fix this? How can I simulate the website on mobile browser view? -->

## Bugs and Error from Priority 2
- [x] Whenever a user deletes their posted item it encountered an error saying "Encountered two children with the same key, ``. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.". While the delete post does work, it is not good to have an error on the console.
- [x] The confirmation process does work on chats. The item should automatically be marked as claimed in the item page and when the item is marked as claimed, users cannot message the poster anymore.
- [x] When enlarging an item's image, I get an error saying two children with the same key
- [ ] In Home page, the text "Search items" doesn't seem to be in the left, why is that? Can you fix it or an alternative way to make the search bar look more appealing?
- [x] The showing of numbers in the chat button of navbar seems to work, but when reading the message or viewing it. It does not update the number of messages. It should go down. How do we fix it? Should we use supabase to update the number of messages?


## Future Features (Priority 3 - later)
- [x] Remove notification settings on profile
- [ ] Suggest a way to verify if the user is a student of the school, 
- [x] Implementing logo on pages such as in, login page, home page, item page, chat page, and profile page.
- [ ] Choosing an appropriate and cohesive font text, font style, font size, with cohesion of the theme's orange palette and iOS feel, design. (This is a must)
- [x] Instead of having the lost on the right side of item page.js, and the found on the left side. Switch them. So lost on the left, found on the right.
- [ ] Make a loading process when loading who posted the item in ItemDetailModal.js
- [ ] 


## Trying to implement this when we feel like it (Priority 3.5 - when have time)
- [ ] Since the website is tailored for mobile view on users, add an admin desktop view that handles the item posting process. Approving the post if the item is appropriate and not a troll. Rejecting it if it is inappropriate or a troll. Use Supabase to also implement this so that admin users have access and authentication. Not all users can access this view, only admin users. Admin users would have a button on the desktop view that says "Admin View". When admin users click it, it would lead them to the admin desktop view. And any admin functions/process that you can think of.


## Very Hard to Implement But Noted (Priority 4 - when have time or when the school accepts it)
- [ ] Implement the use of AI to detect if the picture of the item is appropriate to be posted or not. (Use AI for the detection of the item picture)
- [ ] Implement the use of AI to detect if the user is only trolling or not when messaging or claiming an item.
- [ ] Implement the use of AI to flagged inappropriate messages so that they cannot message that kind of messages anymore or at least warn the user that the message is inappropriate. 