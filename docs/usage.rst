Using the Atom Plugin
========================
After installation, the mounted folder (e.g. ``mnt/``) can be opened in Atom to
make use of the plugin with the command ``atom mnt/``.
The following commands are available in Atom when editing a file in the
CodeGrade filesystem:

+--------------------------------------+-------------+---------------------------------------------------------------------------------------------+
| Command                              | ``--fixed`` | Description                                                                                 |
+======================================+=============+=============================================================================================+
| codegra-atom:edit-line-comment       | ✓           | Edit the comment(s) on the line(s) with a cursor on them.                                   |
+--------------------------------------+-------------+---------------------------------------------------------------------------------------------+
| codegra-atom:delete-line-comment     | ✓           | Delete the comment(s) on the line(s) with a cursor on them.                                 |
+--------------------------------------+-------------+---------------------------------------------------------------------------------------------+
| codegra-atom:open-rubric-editor      | ✗           | Edit the rubric of the assignment of the current file.                                      |
+--------------------------------------+-------------+---------------------------------------------------------------------------------------------+
| codegra-atom:open-rubric-selector    | ✗           | Open the rubric selector file to fill in the rubric for the current submission.             |
+--------------------------------------+-------------+---------------------------------------------------------------------------------------------+
| codegra-atom:edit-geedback           | ✗           | Edit the current submission's global feedback.                                              |
+--------------------------------------+-------------+---------------------------------------------------------------------------------------------+
| codegra-atom:edit-grade              | ✗           | Edit the current submission's grade.                                                        |
+--------------------------------------+-------------+---------------------------------------------------------------------------------------------+
| codegra-atom:select-rubric-item      | ✗           | Select the rubric item that the cursor is on, deselecting any other item in the same group. |
+--------------------------------------+-------------+---------------------------------------------------------------------------------------------+
| codegra-atom:goto-prev-rubric-header | ✗           | Go to the previous header in a rubric file.                                                 |
+--------------------------------------+-------------+---------------------------------------------------------------------------------------------+
| codegra-atom:goto-next-rubric-header | ✗           | Go to the next header in a rubric file.                                                     |
+--------------------------------------+-------------+---------------------------------------------------------------------------------------------+
| codegra-atom:goto-prev-rubric-item   | ✗           | Go to the previous item in a rubric file.                                                   |
+--------------------------------------+-------------+---------------------------------------------------------------------------------------------+
| codegra-atom:goto-next-rubric-item   | ✗           | Go to the next item in a rubric file.                                                       |
+--------------------------------------+-------------+---------------------------------------------------------------------------------------------+

.. note:: The ``--fixed`` flag when mounting is required to use line comment commands.
